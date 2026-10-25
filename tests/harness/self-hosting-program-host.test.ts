import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { analyze, compile } from "@scriptc/compiler";
import { expect, test } from "vitest";
import { ts7Executable } from "../../packages/compiler/src/frontend/ts7/rpc-api.js";

const root = join(import.meta.dirname, "../..");
const nativeSources = join(root, "packages/compiler/native");
const entry = join(root, "tests/fixtures/self-hosting/ts7-program-host.ts");
const oracle = join(root, "tests/fixtures/self-hosting/ts7-program-host-node.ts");
const tempRoot = process.platform === "win32" ? tmpdir() : "/tmp";
const sanitize = process.env["SCRIPTC_SAN"] === "1";

for (const backend of ["llvm"] as const) {
  test(`the shared program host runs statically with its own TypeScript server (${backend})`, async () => {
    const dir = mkdtempSync(join(tempRoot, "scriptc-program-host-"));
    try {
      const object = join(dir, "process.o");
      execFileSync("clang", [
        "-std=c11",
        "-Wall",
        "-Wextra",
        "-Werror",
        ...(sanitize ? ["-fsanitize=address"] : []),
        "-c",
        join(nativeSources, "ts7-process.c"),
        "-o",
        object,
      ]);
      const profile = join(dir, "ffi.json");
      writeFileSync(
        profile,
        JSON.stringify({
          ...JSON.parse(readFileSync(join(nativeSources, "ts7-process.ffi.json"), "utf8")),
          libraries: [object],
        }),
      );
      const { coverage } = analyze(entry, { ffiProfilePath: profile });
      expect(coverage.preflightFailed, JSON.stringify(coverage.diagnostics)).toBe(false);
      expect(coverage.stats.statementsFailed, JSON.stringify(coverage.diagnostics)).toBe(0);
      expect(coverage.stats.functionsSkipped).toBe(0);
      const built = await compile(entry, {
        backend,
        optimization: "dev",
        sanitize,
        ffiProfilePath: profile,
        outDir: dir,
        outPath: join(dir, process.platform === "win32" ? "host.exe" : "host"),
      });
      if (!built.ok)
        throw new Error(built.diagnostics.map((d) => `${d.code}: ${d.message}`).join("\n"));
      const expected = join(dir, "node.json");
      const node = spawnSync(
        process.execPath,
        ["--import", "tsx", oracle, ts7Executable(), dir, expected],
        { encoding: "utf8", timeout: 45_000 },
      );
      expect(node.error, node.stderr).toBeUndefined();
      expect(node.status, node.stderr).toBe(0);
      expect(node.stdout).toBe("");
      expect(node.stderr).toBe("");
      const report = join(dir, "native.json");
      const run = spawnSync(built.binaryPath, [ts7Executable(), dir, report], {
        encoding: "utf8",
        timeout: 45_000,
      });
      expect(run.error, run.stderr).toBeUndefined();
      expect(run.signal, run.stderr).toBeNull();
      expect(run.status, run.stderr).toBe(0);
      expect(run.stdout).toBe(node.stdout);
      expect(run.stderr).toBe(node.stderr);
      expect(JSON.parse(readFileSync(report, "utf8"))).toEqual(
        JSON.parse(readFileSync(expected, "utf8")),
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}
