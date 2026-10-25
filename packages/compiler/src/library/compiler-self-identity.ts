import { createHash } from "node:crypto";
import { lstat, readFile, readdir } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface CompilerImplementationDependency {
  path: string;
  kind: "file" | "directory";
  dev: number;
  ino: number;
  size: number;
  mtimeMs: number;
  ctimeMs: number;
}

export interface CompilerImplementationIdentity {
  digest: string;
  dependencies: CompilerImplementationDependency[];
}

/** The installed compiler package whose bytes define frontend identity. The
 * startup route also uses this location to keep metadata proofs from two
 * source checkouts sharing a cache root from standing in for one another. */
export function compilerImplementationRoot(): string {
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  return resolve(moduleDir, "..", "..");
}

function dependency(
  path: string,
  info: Awaited<ReturnType<typeof lstat>>,
): CompilerImplementationDependency | null {
  const kind = info.isFile() ? "file" : info.isDirectory() ? "directory" : null;
  return kind === null
    ? null
    : {
        path,
        kind,
        dev: Number(info.dev),
        ino: Number(info.ino),
        size: Number(info.size),
        mtimeMs: Number(info.mtimeMs),
        ctimeMs: Number(info.ctimeMs),
      };
}

/** Content identity plus a cheap replay proof for the compiler package that
 * produced an early frontend artifact. Full compiles hash every byte before
 * publication; the CLI fast path validates the captured inode/time/size
 * metadata and loads the large compiler graph only when anything changed. */
export async function compilerImplementationIdentity(
  captureDependencies = true,
  implementationRoot = compilerImplementationRoot(),
): Promise<CompilerImplementationIdentity> {
  const entries: { path: string; directory?: CompilerImplementationDependency | null }[] = [];
  const dependencies: CompilerImplementationDependency[] = [];
  const walk = async (directory: string): Promise<void> => {
    // Capture directories BEFORE enumeration: a new child arriving during
    // the scan must invalidate this proof, even if readdir did not see it.
    entries.push({
      path: directory,
      directory: captureDependencies ? dependency(directory, await lstat(directory)) : null,
    });
    const children = await readdir(directory, { withFileTypes: true });
    children.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of children) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(path);
      } else if (entry.isFile()) {
        entries.push({ path });
      }
    }
  };
  await walk(implementationRoot);
  // Keep the v1 digest byte-identical: dependency metadata augments replay
  // validation without invalidating every existing library/executable entry.
  // Read bounded batches concurrently, then hash in the original sorted DFS
  // order. Serial reads spend hundreds of milliseconds in filesystem round
  // trips on every application edit; reading the entire package at once
  // would retain all its bytes and open an unbounded number of files.
  const hash = createHash("sha256").update("scriptc-frontend-implementation-v1\0");
  const batchSize = 64;
  for (let start = 0; start < entries.length; start += batchSize) {
    const batch = await Promise.all(
      entries.slice(start, start + batchSize).map(async (entry) => {
        if (entry.directory !== undefined) return { ...entry, info: entry.directory, bytes: null };
        const info = captureDependencies ? dependency(entry.path, await lstat(entry.path)) : null;
        return { ...entry, info, bytes: await readFile(entry.path) };
      }),
    );
    for (const entry of batch) {
      if (entry.info !== null) dependencies.push(entry.info);
      if (entry.bytes !== null) {
        hash
          .update(relative(implementationRoot, entry.path))
          .update("\0")
          .update(entry.bytes)
          .update("\0");
      }
    }
  }
  return { digest: hash.digest("hex"), dependencies };
}

function validDependency(value: unknown): value is CompilerImplementationDependency {
  if (value === null || typeof value !== "object") return false;
  const item = value as Partial<CompilerImplementationDependency>;
  return (
    typeof item.path === "string" &&
    (item.kind === "file" || item.kind === "directory") &&
    typeof item.dev === "number" &&
    typeof item.ino === "number" &&
    typeof item.size === "number" &&
    typeof item.mtimeMs === "number" &&
    typeof item.ctimeMs === "number"
  );
}

export async function compilerImplementationDependenciesStillMatch(
  dependencies: readonly CompilerImplementationDependency[],
): Promise<boolean> {
  if (!Array.isArray(dependencies) || !dependencies.every(validDependency)) return false;
  const current = await Promise.all(
    dependencies.map(async (expected) => {
      const info = await lstat(expected.path).catch(() => null);
      if (info === null) return false;
      const observed = dependency(expected.path, info);
      return observed !== null && JSON.stringify(observed) === JSON.stringify(expected);
    }),
  );
  return current.every(Boolean);
}
