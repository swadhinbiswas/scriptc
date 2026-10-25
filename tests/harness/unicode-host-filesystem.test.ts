import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compile } from "@scriptc/compiler";
import { expect, test } from "vitest";

for (const backend of ["llvm"] as const) {
  test(`host filesystem preserves Unicode paths and directory entries (${backend})`, async () => {
    const scratch = mkdtempSync(
      join(process.platform === "win32" ? tmpdir() : "/tmp", "scriptc-unicode-host-"),
    );
    try {
      const directory = join(realpathSync(scratch), "工作-🌍");
      mkdirSync(directory);
      const entry = join(
        import.meta.dirname,
        "../fixtures/self-hosting/unicode-host-filesystem.ts",
      );
      const result = await compile(entry, {
        backend,
        sanitize: process.env["SCRIPTC_SAN"] === "1",
        optimization: "dev",
        outDir: scratch,
        outPath: join(scratch, process.platform === "win32" ? "test.exe" : "test"),
      });
      if (!result.ok)
        throw new Error(result.diagnostics.map((d) => `${d.code}: ${d.message}`).join("\n"));
      const oracle = spawnSync(process.execPath, ["--import", "tsx", entry, directory], {
        encoding: "utf8",
        timeout: 10_000,
      });
      const run = spawnSync(result.binaryPath, [directory], { encoding: "utf8", timeout: 10_000 });
      expect(oracle.status, oracle.stderr).toBe(0);
      expect(run.status, run.stderr).toBe(oracle.status);
      expect(run.stdout).toBe(oracle.stdout);
      expect(run.stderr).toBe(oracle.stderr);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  });
}
