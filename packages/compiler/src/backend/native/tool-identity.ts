import { toolchainEnvironmentFingerprint } from "../toolchain-environment.js";
import { createHash, randomUUID } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { access, mkdtemp, realpath, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, delimiter, dirname, extname, isAbsolute, join, resolve } from "node:path";
import { resolveCc, type CcDriver } from "./driver.js";
import { execFileAsync } from "./process.js";
import { normalizedProbeInvocation, effectiveCompilerSpellings } from "./trace-paths.js";
import { stableTestToolchainSession } from "./session.js";

/** Inputs that can change which native tool/runtime implementation an
 * executable build selects before compileC has a chance to rediscover it.
 * The early whole-program cache keys this exact posture before restoring a
 * final binary; compileC retains its deeper inode/content validation. */
export async function executableNativeEnvironmentFingerprint(
  env: NodeJS.ProcessEnv = process.env,
): Promise<string> {
  const configuredCompiler = env["SCRIPTC_CC"] ?? "";
  let compilerIdentity: string;
  try {
    compilerIdentity = await effectiveCompilerEnvironmentIdentity(resolveCc(env), env);
  } catch {
    // A failed trace cannot safely describe a reusable native posture. Keep
    // the build working, but make this invocation miss every persistent early
    // entry so compileC performs its full discovery and validation.
    compilerIdentity = `<unavailable:${configuredCompiler}:${randomUUID()}>`;
  }
  const hash = createHash("sha256")
    .update("executable-native-environment-v2\0")
    .update(toolchainEnvironmentFingerprint(env))
    .update("\0")
    // PATH text alone is not a resolution proof, and on Darwin /usr/bin/clang
    // is a stable shim whose selected Xcode compiler can change underneath it.
    // Re-resolve and trace the effective driver on every early lookup.
    .update(compilerIdentity)
    .update("\0");
  for (const name of [
    "PATH",
    "SCRIPTC_TEST_RUNTIME_SRC_DIR",
    "SCRIPTC_TEST_VENDOR_CACHE_DIR",
    "SCRIPTC_TEST_TRUST_COMPILER_WRAPPER",
  ]) {
    const value = env[name];
    hash
      .update(name)
      .update(value === undefined ? "\0unset\0" : "\0set\0")
      .update(value ?? "")
      .update("\0");
  }
  return hash.digest("hex");
}

const ccVersionMemos = new Map<string, Promise<string>>();

interface ResolvedTool {
  canonicalPath: string;
  cacheIdentity: string;
  fileIdentity: string;
}

/** Identity of the compiler implementation and configuration selected by a
 * fresh driver invocation. In particular, Darwin's stable /usr/bin/clang shim
 * exposes the currently selected Xcode clang only in its `-###` trace. The
 * normalized trace also covers output-affecting default driver configuration
 * that can change while argv[0] and PATH retain the same spelling. */
async function effectiveCompilerEnvironmentIdentity(
  driver: Pick<CcDriver, "argv" | "targetArgs">,
  env: NodeJS.ProcessEnv,
): Promise<string> {
  const compiler = driver.argv[0] ?? "clang";
  const resolvedDriver = await resolvedTool(compiler, env);
  if (resolvedDriver === null) return `<unresolved:${compiler}>`;
  const probeDir = await mkdtemp(join(tmpdir(), "scriptc-early-cc-probe-"));
  try {
    const source = join(probeDir, "empty.c");
    const object = join(probeDir, "empty.o");
    await writeFile(source, "int scriptc_early_driver_probe;\n");
    const trace = await execFileAsync(
      compiler,
      [
        ...driver.argv.slice(1),
        ...driver.targetArgs,
        "-###",
        "-std=c11",
        "-c",
        source,
        "-o",
        object,
      ],
      { cwd: probeDir, env, maxBuffer: 16 * 1024 * 1024 },
    );
    const effectiveSpellings = effectiveCompilerSpellings(trace);
    const effective =
      effectiveSpellings.length === 1 ? await resolvedTool(effectiveSpellings[0]!, env) : null;
    return createHash("sha256")
      .update("effective-compiler-environment-v1\0")
      .update(resolvedDriver.cacheIdentity)
      .update("\0")
      .update(normalizedProbeInvocation(trace, probeDir))
      .update("\0")
      .update(
        effective?.cacheIdentity ?? `<unresolved-effective:${effectiveSpellings.join("\x1f")}>`,
      )
      .digest("hex");
  } finally {
    await rm(probeDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

/** Resolve the executable the OS will select for an argv[0] spelling. The
 * path and inode metadata join the version output below: two PATH postures
 * must not share cache entries merely because both drivers call themselves
 * `clang` or print the same upstream version. ctime catches an in-place tool
 * replacement even when a package manager preserves its size and mtime. */
export async function resolvedTool(
  command: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<ResolvedTool | null> {
  const hasSeparator = command.includes("/") || command.includes("\\");
  const configuredPath = (
    env["PATH"] ?? (process.platform === "win32" ? "" : "/usr/bin:/bin")
  ).split(delimiter);
  const pathEntries = hasSeparator
    ? [""]
    : process.platform === "win32"
      ? ["", dirname(process.execPath), ...configuredPath]
      : configuredPath;
  const windowsExtensions =
    process.platform === "win32" && extname(command) === ""
      ? (env["PATHEXT"] ?? ".COM;.EXE;.BAT;.CMD").split(";").filter((extension) => extension !== "")
      : [""];
  for (const entry of pathEntries) {
    const directory = entry.startsWith('"') && entry.endsWith('"') ? entry.slice(1, -1) : entry;
    const base = hasSeparator
      ? isAbsolute(command)
        ? command
        : resolve(command)
      : join(directory === "" ? process.cwd() : directory, command);
    for (const extension of windowsExtensions) {
      const candidate = `${base}${extension}`;
      try {
        await access(candidate, process.platform === "win32" ? fsConstants.F_OK : fsConstants.X_OK);
        const [canonical, info] = await Promise.all([realpath(candidate), stat(candidate)]);
        if (!info.isFile()) continue;
        const fileIdentity = [
          canonical,
          info.dev,
          info.ino,
          info.size,
          info.mtimeMs,
          info.ctimeMs,
        ].join("\0");
        return {
          canonicalPath: canonical,
          fileIdentity,
          cacheIdentity: [resolve(candidate), fileIdentity].join("\0"),
        };
      } catch {
        // Keep searching PATH/PATHEXT exactly as process spawning would.
      }
    }
  }
  return null;
}

export async function resolvedToolIdentity(
  command: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<string | null> {
  return (await resolvedTool(command, env))?.cacheIdentity ?? null;
}

const directCompilerDriverMemos = new Map<string, boolean>();
export const directCompilerSelections = new Map<string, ResolvedTool>();

export function compilerDriverProbeKey(
  driver: Pick<CcDriver, "argv" | "targetArgs" | "target">,
  environmentFingerprint: string,
): string {
  return [
    environmentFingerprint,
    driver.argv.join("\x1f"),
    driver.target ?? "<native>",
    driver.targetArgs.join("\x1f"),
  ].join("\0");
}

/** `/usr/bin/clang` on Darwin is Apple's immutable driver shim: its `-###`
 * trace names the selected Xcode/CommandLineTools clang rather than the shim
 * itself. The ordinary implicit-toolchain fingerprint below captures that
 * selected executable and its dependencies, so this trusted system handoff is
 * the one intentional exception to the same-executable rule. */
function isAppleSystemClangHandoff(driver: ResolvedTool, effectiveCompiler: ResolvedTool): boolean {
  return (
    process.platform === "darwin" &&
    driver.canonicalPath === "/usr/bin/clang" &&
    basename(effectiveCompiler.canonicalPath) === "clang"
  );
}

/** Persistent caches require an inspectable compiler driver. A general
 * wrapper can branch on the real source/object paths or argument topology and
 * inject inputs only into the final invocation; no synthetic metadata probe
 * can safely represent that behavior. Accept direct Clang/Zig drivers (plus
 * Apple's system shim) and conservatively keep wrapper-driven builds on the
 * uncached path. */
export async function compilerDriverSupportsPersistentCache(
  driver: Pick<CcDriver, "argv" | "targetArgs" | "target">,
  environmentFingerprint: string,
): Promise<boolean> {
  // Cache-race tests exercise publication below an intentionally instrumented
  // wrapper. This is deliberately undocumented and test-scoped.
  if (process.env["SCRIPTC_TEST_TRUST_COMPILER_WRAPPER"] === "1") return true;

  const driverKey = compilerDriverProbeKey(driver, environmentFingerprint);
  const compiler = driver.argv[0] ?? "clang";
  const resolvedDriver = await resolvedTool(compiler);
  // A prior dependency list cannot prove that name resolution is unchanged:
  // a new header in an earlier search directory leaves every previously
  // resolved file untouched. Require the driver to be present so each cache
  // invocation can rediscover its complete dependency graph.
  if (resolvedDriver === null) return false;
  const probeKey = `${driverKey}\0${resolvedDriver.fileIdentity}`;
  const memoized = directCompilerDriverMemos.get(probeKey);
  if (memoized !== undefined) return memoized;

  const probeDir = await mkdtemp(join(tmpdir(), "scriptc-driver-probe-"));
  let direct = false;
  try {
    const source = join(probeDir, "empty.c");
    const object = join(probeDir, "empty.o");
    await writeFile(source, "int scriptc_driver_probe;\n");
    const trace = await execFileAsync(
      compiler,
      [
        ...driver.argv.slice(1),
        ...driver.targetArgs,
        "-###",
        "-std=c11",
        "-c",
        source,
        "-o",
        object,
      ],
      { cwd: probeDir, maxBuffer: 16 * 1024 * 1024 },
    );
    const effectiveSpellings = effectiveCompilerSpellings(trace);
    if (effectiveSpellings.length === 1) {
      const effectiveCompiler = await resolvedTool(effectiveSpellings[0]!);
      direct =
        effectiveCompiler !== null &&
        (effectiveCompiler.fileIdentity === resolvedDriver.fileIdentity ||
          isAppleSystemClangHandoff(resolvedDriver, effectiveCompiler));
      if (direct) directCompilerSelections.set(driverKey, effectiveCompiler!);
    }
  } catch {
    direct = false;
  } finally {
    await rm(probeDir, { recursive: true, force: true }).catch(() => undefined);
  }
  directCompilerDriverMemos.set(probeKey, direct);
  if (!direct) directCompilerSelections.delete(driverKey);
  return direct;
}

/** Complete library archives may skip `ar`, so the selected archiver must be
 * as inspectable as the compiler. `zig ar` is the already-validated Zig
 * executable. For the host spelling, accept only the immutable platform
 * tool locations; a PATH wrapper can branch on the real member topology or
 * inject mutable inputs that `ar --version` cannot expose. Other archivers
 * retain runtime-object reuse but rebuild the program member and archive. */
export async function archiverSupportsPersistentCache(
  arArgv: readonly string[],
  driver: Pick<CcDriver, "argv">,
): Promise<boolean> {
  if (
    arArgv.length === 2 &&
    arArgv[0] === driver.argv[0] &&
    arArgv[1] === "ar" &&
    driver.argv[0] === "zig"
  ) {
    return true;
  }
  if (arArgv.length !== 1) return false;
  const archiver = await resolvedTool(arArgv[0] ?? "ar");
  if (archiver === null || !/(?:^|-)ar$/.test(basename(archiver.canonicalPath))) {
    return false;
  }
  if (
    archiver.canonicalPath.startsWith("/usr/bin/") ||
    archiver.canonicalPath.startsWith("/bin/")
  ) {
    return true;
  }
  return (
    process.platform === "darwin" &&
    /^\/Applications\/Xcode[^/]*\.app\/Contents\/Developer\/Toolchains\/[^/]+\.xctoolchain\/usr\/bin\/[^/]*ar$/.test(
      archiver.canonicalPath,
    )
  );
}

export async function ccVersion(
  argv: string[],
  environmentFingerprint: string = toolchainEnvironmentFingerprint(),
  fresh: boolean = false,
): Promise<string> {
  const spellingKey = `${environmentFingerprint}\0${argv.join("\x1f")}`;
  const executableIdentity = await resolvedToolIdentity(argv[0] ?? "clang");
  const key = `${spellingKey}\0${executableIdentity ?? "<unresolved>"}`;
  const probe = (): Promise<string> =>
    // `zig cc --version` (zig 0.16) drops an empty a.o in its cwd. A private
    // probe directory avoids both caller pollution and the cross-process /
    // cross-user collision a fixed tmpdir()/a.o would create on Linux.
    (async () => {
      const probeDir = await mkdtemp(join(tmpdir(), "scriptc-cc-version-"));
      try {
        const r = await execFileAsync(argv[0] ?? "clang", [...argv.slice(1), "--version"], {
          cwd: probeDir,
        });
        return `${executableIdentity ?? "<unresolved>"}\0${`${r.stdout}\n${r.stderr}`.trim()}`;
      } finally {
        await rm(probeDir, { recursive: true, force: true }).catch(() => undefined);
      }
    })();
  const requireFreshProbe = fresh && !stableTestToolchainSession();
  let memo = requireFreshProbe && executableIdentity !== null ? probe() : ccVersionMemos.get(key);
  if (memo === undefined) {
    memo = probe();
    ccVersionMemos.set(key, memo);
  } else if (requireFreshProbe) {
    ccVersionMemos.set(key, memo);
  }
  return memo;
}

const toolVersionMemos = new Map<string, Promise<string>>();
const toolVersionFallbacks = new Map<string, Promise<string>>();
export async function toolVersionOnce(
  argv: string[],
  environmentFingerprint: string = toolchainEnvironmentFingerprint(),
  fresh: boolean = false,
): Promise<string> {
  const spellingKey = `${environmentFingerprint}\0${argv.join("\x1f")}`;
  const executableIdentity = await resolvedToolIdentity(argv[0] ?? "ar");
  if (executableIdentity === null) {
    const fallback = toolVersionFallbacks.get(spellingKey);
    if (fallback !== undefined) return fallback;
  }
  const key = `${spellingKey}\0${executableIdentity ?? "<unresolved>"}`;
  const probe = (): Promise<string> =>
    execFileAsync(argv[0] ?? "ar", [...argv.slice(1), "--version"]).then(
      (r) => `${executableIdentity ?? "<unresolved>"}\0${`${r.stdout}\n${r.stderr}`.trim()}`,
      (err: { stdout?: string; stderr?: string; message?: string }) =>
        `${executableIdentity ?? "<unresolved>"}\0${`${err.stdout ?? ""}\n${err.stderr ?? ""}`.trim() || err.message || key}`,
    );
  let memo = fresh && executableIdentity !== null ? probe() : toolVersionMemos.get(key);
  if (memo === undefined) {
    memo = probe();
    toolVersionMemos.set(key, memo);
  } else if (fresh) {
    toolVersionMemos.set(key, memo);
  }
  if (executableIdentity !== null) toolVersionFallbacks.set(spellingKey, memo);
  return memo;
}
