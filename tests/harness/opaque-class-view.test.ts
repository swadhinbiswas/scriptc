import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compile } from "@scriptc/compiler";
import { expect, test } from "vitest";

for (const backend of ["llvm"] as const) {
  test(`opaque class fields refuse dynamic views while preserving exact recovery (${backend})`, async () => {
    const dir = mkdtempSync(
      join(process.platform === "win32" ? tmpdir() : "/tmp", "scriptc-opaque-class-"),
    );
    try {
      const result = await compile(
        join(import.meta.dirname, "../fixtures/self-hosting/opaque-class-view.ts"),
        {
          backend,
          sanitize: process.env["SCRIPTC_SAN"] === "1",
          optimization: "dev",
          outDir: dir,
          outPath: join(dir, process.platform === "win32" ? "test.exe" : "test"),
        },
      );
      if (!result.ok)
        throw new Error(result.diagnostics.map((d) => `${d.code}: ${d.message}`).join("\n"));
      expect(execFileSync(result.binaryPath, { encoding: "utf8", timeout: 10_000 })).toBe("10 0\n");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}
