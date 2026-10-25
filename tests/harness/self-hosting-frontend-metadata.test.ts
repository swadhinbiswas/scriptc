import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { analyze, compile } from "@scriptc/compiler";
import { expect, test } from "vitest";

const root = join(import.meta.dirname, "../..");
const entry = join(root, "tests/fixtures/self-hosting/frontend-metadata.ts");

for (const backend of ["llvm"] as const) {
  test(`production package transforms and TS7 options execute natively (${backend})`, async () => {
    const directory = mkdtempSync(
      join(process.platform === "win32" ? tmpdir() : "/tmp", "scriptc-frontend-metadata-"),
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
        sanitize: process.env["SCRIPTC_SAN"] === "1",
        outDir: directory,
        outPath: join(directory, process.platform === "win32" ? "metadata.exe" : "metadata"),
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
      expect(actual.stdout).toContain('"import":"./esm.js","require":"./cjs.js"');
      expect(actual.stdout).toContain("./feature/use ./esm/use.js");
      expect(actual.stdout).toContain("false true true 7 99");
      expect(actual.stdout).toContain("true lib.es2023.d.ts");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
}
