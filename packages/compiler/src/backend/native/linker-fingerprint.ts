import { driverTraceCandidates, linkTraceCandidate } from "../link-trace.js";
import { toolchainEnvironmentFingerprint } from "../toolchain-environment.js";
import { createHash } from "node:crypto";
import { mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { type CcDriver } from "./driver.js";
import { resolvedToolIdentity, resolvedTool } from "./tool-identity.js";
import { execFileAsync } from "./process.js";
import {
  fingerprintDependencyFiles,
  rememberFingerprintDependencies,
  fingerprintDependencyPaths,
} from "./dependency-files.js";
import { existingDriverTracePaths, normalizedProbeInvocation } from "./trace-paths.js";
import { stableTestMemo } from "./session.js";

interface ImplicitLinkerProbe {
  compilerIdentity: string;
  linkerInvocation: string;
  dependencies: string[];
  dependencyFingerprint: string;
  invocationPaths: string[];
  linker: { spelling: string; identity: string | null; path: string | null };
}

export async function parseLinkTraceFiles(
  output: string,
  cwd: string,
  excludedRoot: string,
  driverDryRun: boolean = false,
): Promise<string[]> {
  const files = new Set<string>();
  for (const line of output.split(/\r?\n/)) {
    const candidates = driverDryRun ? driverTraceCandidates(line) : linkTraceCandidate(line);
    for (const candidate of candidates) {
      const path = isAbsolute(candidate) ? candidate : resolve(cwd, candidate);
      if (
        path === excludedRoot ||
        path.startsWith(`${excludedRoot}/`) ||
        path.startsWith(`${excludedRoot}\\`)
      ) {
        continue;
      }
      const info = await stat(path).catch(() => null);
      if (info?.isFile()) {
        files.add(path);
        // Traditional `-Wl,-t` output has one dependency per line, while
        // Zig's COFF `-###` fallback prints the entire lld-link argv on one
        // line. Keep scanning every dry-run token so CRT/import/runtime
        // libraries after the first path also join the fingerprint.
        if (!driverDryRun) break;
      }
    }
  }
  return [...files].sort();
}

/** Exact files selected by the compiler driver's implicit link. A tiny
 * target object plus the linker's trace mode resolves CRT objects, compiler
 * runtimes, linker scripts, SDK stubs/import libraries, and every ambient
 * default library without guessing platform search layouts. The caller adds
 * build-flavor flags such as ASan and scriptc's own fixed `-l` arguments.
 * Every cache-enabled invocation performs a fresh trace; a prior resolved path
 * list cannot reveal a newly selected higher-priority linker input. */
async function implicitLinkerFingerprintFresh(
  driver: Pick<CcDriver, "argv" | "targetArgs" | "target">,
  environmentFingerprint: string,
  linkArgs: readonly string[],
  effectiveInvocationArgs?: readonly string[],
  traceInvocationArgs?: readonly string[],
): Promise<string> {
  const invocationArgs = effectiveInvocationArgs ?? [...driver.targetArgs, ...linkArgs];
  const traceArgs = traceInvocationArgs ?? [...driver.targetArgs, ...linkArgs];
  const compiler = driver.argv[0] ?? "clang";
  const compilerIdentity = await resolvedToolIdentity(compiler);
  if (compilerIdentity === null) {
    throw new Error("compiler unavailable before implicit linker identity was established");
  }
  let probe: ImplicitLinkerProbe;
  {
    const probeDir = await mkdtemp(join(tmpdir(), "scriptc-linker-probe-"));
    try {
      const source = join(probeDir, "empty.c");
      const object = join(probeDir, "empty.o");
      const output = join(probeDir, process.platform === "win32" ? "empty.exe" : "empty");
      await writeFile(source, "int main(void) { return 0; }\n");
      const prefix = [...driver.argv.slice(1), ...driver.targetArgs];
      const [, linker] = await Promise.all([
        execFileAsync(compiler, [...prefix, "-std=c11", "-c", source, "-o", object], {
          cwd: probeDir,
        }),
        execFileAsync(compiler, [...prefix, "-print-prog-name=ld"], { cwd: probeDir }),
      ]);
      // Unlike the compile-only toolchain trace, this exposes options a
      // compiler wrapper/config injects only for link invocations (rpaths,
      // subsystem/stack settings, --defsym, and peers). Resolved input files
      // alone cannot represent those output-affecting flags.
      const driverInvocation = await execFileAsync(
        compiler,
        [...driver.argv.slice(1), ...invocationArgs, object, "-###", "-o", output],
        { cwd: probeDir, maxBuffer: 32 * 1024 * 1024 },
      );
      // The dry run exposes absolute files a wrapper injects for this exact
      // build flavor. Its unresolved -l spellings are supplemented by the
      // real trace below, which runs with the same flavor flags but omits
      // not-yet-materialized scriptc-owned vendor prerequisites.
      const driverDependencies = await parseLinkTraceFiles(
        `${driverInvocation.stdout}\n${driverInvocation.stderr}`,
        probeDir,
        probeDir,
        true,
      );
      let tracedDependencies: string[] = [];
      try {
        const trace = await execFileAsync(
          compiler,
          [...driver.argv.slice(1), ...traceArgs, object, "-Wl,-t", "-o", output],
          { cwd: probeDir, maxBuffer: 32 * 1024 * 1024 },
        );
        tracedDependencies = await parseLinkTraceFiles(
          `${trace.stdout}\n${trace.stderr}`,
          probeDir,
          probeDir,
        );
      } catch (error) {
        // Zig's COFF linker deliberately rejects GNU ld's `-t`, but `zig cc
        // -###` prints its fully resolved lld-link input list (CRT and every
        // import/compiler-runtime library as absolute cache paths). Other
        // drivers' dry runs commonly leave `-lc`/`-lSystem` unresolved, so
        // they must not use this fallback as a complete artifact identity.
        if (driver.argv[0] !== "zig" || driver.argv[1] !== "cc") throw error;
      }
      const dependencies = [...new Set([...driverDependencies, ...tracedDependencies])].sort();
      if (dependencies.length === 0) {
        throw new Error("linker trace reported no resolved input files");
      }
      const linkerSpelling = linker.stdout.trim();
      probe = {
        compilerIdentity,
        linkerInvocation: normalizedProbeInvocation(driverInvocation, probeDir),
        dependencies,
        dependencyFingerprint: await fingerprintDependencyFiles(dependencies),
        invocationPaths: await existingDriverTracePaths(
          `${driverInvocation.stdout}\n${driverInvocation.stderr}`,
          probeDir,
          probeDir,
        ),
        linker: {
          spelling: linkerSpelling,
          identity:
            linkerSpelling === ""
              ? null
              : ((await resolvedTool(linkerSpelling))?.cacheIdentity ?? null),
          path:
            linkerSpelling === ""
              ? null
              : ((await resolvedTool(linkerSpelling))?.canonicalPath ?? null),
        },
      };
    } finally {
      await rm(probeDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  const linkerIdentity =
    probe.linker.spelling === "" ? null : await resolvedToolIdentity(probe.linker.spelling);
  const fingerprint = createHash("sha256")
    .update("implicit-linker-v3\0")
    .update(environmentFingerprint)
    .update("\0")
    .update(probe.compilerIdentity)
    .update("\0")
    .update(probe.linkerInvocation)
    .update("\0")
    .update(driver.argv.join("\x1f"))
    .update("\0")
    .update(driver.targetArgs.join("\x1f"))
    .update("\0")
    .update(linkArgs.join("\x1f"))
    .update("\0")
    .update(invocationArgs.join("\x1f"))
    .update("\0")
    .update(traceArgs.join("\x1f"))
    .update("\0")
    .update(probe.dependencies.join("\x1f"))
    .update("\0")
    .update(probe.dependencyFingerprint)
    .update("\0")
    .update(probe.linker.spelling)
    .update("\0")
    .update(linkerIdentity ?? probe.linker.identity ?? "<unresolved>")
    .digest("hex");
  return rememberFingerprintDependencies(
    fingerprint,
    [
      ...probe.dependencies,
      ...probe.invocationPaths,
      ...(probe.linker.path === null ? [] : [probe.linker.path]),
    ],
    probe.dependencies,
    probe.dependencyFingerprint,
  );
}

const stableImplicitLinkerMemos = new Map<string, Promise<string>>();
export function implicitLinkerFingerprint(
  driver: Pick<CcDriver, "argv" | "targetArgs" | "target">,
  environmentFingerprint: string,
  linkArgs: readonly string[],
  effectiveInvocationArgs?: readonly string[],
  traceInvocationArgs?: readonly string[],
): Promise<string> {
  const invocationArgs = effectiveInvocationArgs ?? [...driver.targetArgs, ...linkArgs];
  const traceArgs = traceInvocationArgs ?? [...driver.targetArgs, ...linkArgs];
  const key = [
    environmentFingerprint,
    driver.argv.join("\x1f"),
    driver.target ?? "<native>",
    driver.targetArgs.join("\x1f"),
    linkArgs.join("\x1f"),
    invocationArgs.join("\x1f"),
    traceArgs.join("\x1f"),
  ].join("\0");
  return stableTestMemo(stableImplicitLinkerMemos, key, () =>
    implicitLinkerFingerprintFresh(
      driver,
      environmentFingerprint,
      linkArgs,
      effectiveInvocationArgs,
      traceInvocationArgs,
    ),
  );
}

/** Resolve the exact files consumed by one compiler-driver link invocation.
 * Runtime packs reuse the native toolchain's strict dry-run plus real linker
 * trace so a PATH-selected Clang carries its own linker, SDK, compiler
 * runtime, and injected inputs into the executable cache proof. */
export async function nativeLinkerDependencyPaths(
  linker: string,
  linkArgs: readonly string[],
): Promise<string[]> {
  const fingerprint = await implicitLinkerFingerprint(
    { argv: [linker], targetArgs: [], target: null },
    toolchainEnvironmentFingerprint(),
    linkArgs,
  );
  return fingerprintDependencyPaths(fingerprint);
}
