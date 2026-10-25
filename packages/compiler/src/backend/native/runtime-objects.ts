import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import {
  stageCachedFile,
  cacheDigestPath,
  publishCachedFile,
  validCachedFile,
} from "../build-cache.js";
import { execFileAsync } from "./process.js";
import { CacheInputsChangedError } from "./session.js";

let ccacheMemo: Promise<boolean> | null = null;

/** Reset process observations whose validity is bounded to one public native
 * build. A long-lived caller may change PATH or install/remove ccache between
 * invocations; the next build must probe that environment again. */
export function clearCcCaches(): void {
  ccacheMemo = null;
}

function ccacheAvailable(): Promise<boolean> {
  ccacheMemo ??= execFileAsync("ccache", ["--version"]).then(
    () => true,
    () => false,
  );
  return ccacheMemo;
}

/** The cached .o set for one flag flavor, compiled on first need. Concurrent
 * first builds (parallel test workers on a cold cache) may duplicate work;
 * per-file atomic renames make every winner equivalent. Publication is held
 * until verifyInputs confirms that the source/header fingerprint used by the
 * key still describes the bytes clang just read. */
export async function ensureRuntimeObjects(
  root: string,
  ccArgv: string[],
  cflags: string[],
  sources: string[],
  keyPrefix: string,
  verifyInputs: () => Promise<boolean>,
  protectedPaths?: Set<string>,
): Promise<Map<string, string>> {
  const setKey = createHash("sha256")
    .update(keyPrefix)
    .update(cflags.join("\x1f"))
    .digest("hex")
    .slice(0, 24);
  const objDir = join(root, "obj", setKey);
  const objOf = (src: string): string => join(objDir, `${basename(src, ".c")}.o`);
  if (protectedPaths !== undefined) {
    for (const source of sources) {
      const object = objOf(source);
      protectedPaths.add(object);
      protectedPaths.add(cacheDigestPath(object));
    }
  }
  const present = await Promise.all(sources.map((s) => validCachedFile(objOf(s))));
  const missing = sources.filter((_, i) => !present[i]);
  if (missing.length > 0) {
    // ccache wraps only the default clang driver — multi-word drivers
    // (`zig cc`) run bare; their object sets are keyed apart anyway.
    const useCcache =
      process.env["SCRIPTC_TEST_DISABLE_CCACHE"] !== "1" &&
      ccArgv.length === 1 &&
      ccArgv[0] === "clang" &&
      (await ccacheAvailable());
    await mkdir(objDir, { recursive: true });
    const tmpDir = await mkdtemp(join(tmpdir(), "scriptc-cache-obj-"));
    try {
      const compiled = new Map<string, string>();
      // Modest parallelism: a flavor's objects build once, but several cold
      // workers can race here — keep each build's CPU footprint small.
      const width = 4;
      for (let i = 0; i < missing.length; i += width) {
        await Promise.all(
          missing.slice(i, i + width).map(async (src) => {
            const tmpObj = join(tmpDir, `${basename(src, ".c")}.o`);
            const argv = [
              ...(useCcache ? ["ccache"] : []),
              ...ccArgv,
              ...cflags,
              "-c",
              src,
              "-o",
              tmpObj,
            ];
            await execFileAsync(
              argv[0] ?? "clang",
              argv.slice(1),
              useCcache
                ? {
                    // ccache direct mode remembers only the headers selected by
                    // its previous manifest and can miss a newly created,
                    // higher-priority header. The scriptc object-set key already
                    // includes the recursive runtime namespace fingerprint, so
                    // carry it into ccache's own keyspace as well.
                    env: {
                      ...process.env,
                      CCACHE_NAMESPACE: [process.env["CCACHE_NAMESPACE"], `scriptc-${setKey}`]
                        .filter((value) => value !== undefined && value !== "")
                        .join(":"),
                    },
                  }
                : undefined,
            );
            compiled.set(src, tmpObj);
          }),
        );
      }
      // The fingerprint was computed before these subprocesses started. Do
      // not place their outputs under that key if a checkout/package update
      // changed any runtime source or included header while clang was reading.
      if (!(await verifyInputs())) throw new CacheInputsChangedError();
      for (const [src, built] of compiled) {
        const destination = objOf(src);
        await publishCachedFile(built, destination);
      }
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  }
  if (!(await verifyInputs())) throw new CacheInputsChangedError();
  const objects = new Map(sources.map((s) => [s, objOf(s)]));
  if (!(await Promise.all([...objects.values()].map(validCachedFile))).every(Boolean)) {
    throw new Error("native object cache integrity check failed");
  }
  return objects;
}

/** Give one active link/archive operation private names for its cached
 * runtime objects. A hard link keeps the inode alive if another process's LRU
 * sweep unlinks the cache entry; filesystems that cannot hard-link across the
 * cache/tmp boundary fall back to a copy. If eviction wins before staging,
 * the caller catches the read failure and performs a fully fresh compile. */
export async function stageRuntimeObjects(
  objects: ReadonlyMap<string, string>,
  stageDir: string,
): Promise<Map<string, string>> {
  await mkdir(stageDir, { recursive: true });
  const now = new Date();
  const staged = await Promise.all(
    [...objects].map(async ([source, object]) => {
      const destination = join(stageDir, basename(object));
      await stageCachedFile(object, destination, now);
      return [source, destination] as const;
    }),
  );
  return new Map(staged);
}
