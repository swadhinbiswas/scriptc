import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { analyze, compile } from "@scriptc/compiler";
import { expect, test } from "vitest";

const root = join(import.meta.dirname, "../..");
const entry = join(root, "tests/fixtures/self-hosting/frontend-collections.ts");
const sanitize = process.env["SCRIPTC_SAN"] === "1";

for (const backend of ["llvm"] as const) {
  test(`frontend builtin and package registries execute natively (${backend})`, async () => {
    const directory = mkdtempSync(
      join(process.platform === "win32" ? tmpdir() : "/tmp", "scriptc-frontend-collections-"),
    );
    try {
      const { coverage } = analyze(entry, {});
      expect(coverage.preflightFailed, JSON.stringify(coverage.diagnostics)).toBe(false);
      expect(coverage.diagnostics).toEqual([]);
      expect(coverage.stats.statementsFailed).toBe(0);
      expect(coverage.stats.functionsSkipped).toBe(0);
      const built = await compile(entry, {
        backend,
        optimization: "dev",
        sanitize,
        outDir: directory,
        outPath: join(directory, process.platform === "win32" ? "registry.exe" : "registry"),
      });
      if (!built.ok)
        throw new Error(built.diagnostics.map((d) => `${d.code}: ${d.message}`).join("\n"));
      const expected = spawnSync(process.execPath, ["--import", "tsx", entry], {
        encoding: "utf8",
        timeout: 30_000,
      });
      expect(expected.error).toBeUndefined();
      expect(expected.status, expected.stderr).toBe(0);
      expect(expected.stderr).toBe("");
      const actual = spawnSync(built.binaryPath, [], { encoding: "utf8", timeout: 30_000 });
      expect(actual.error).toBeUndefined();
      expect(actual.signal, actual.stderr).toBeNull();
      expect(actual.status, actual.stderr).toBe(expected.status);
      expect(actual.stderr).toBe(expected.stderr);
      expect(actual.stdout).toBe(expected.stdout);
      expect(actual.stdout).toContain('[["left","first reason"],["@scope/right","second reason"]]');
      expect(actual.stdout).toContain("0 2 true");
      expect(actual.stdout.endsWith("false 0\n")).toBe(true);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
}
