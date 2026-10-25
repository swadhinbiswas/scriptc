/* util.stripVTControlCharacters runs in linear time on unterminated OSC
 * introducers: Node's pattern, applied by a backtracking matcher at every
 * position, rescans the rest of the text from each introducer. */
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compile } from "@scriptc/compiler";
import { expect, test } from "vitest";

const root = join(import.meta.dirname, "../..");
const entry = join(root, "tests/fixtures/strip-vt/unterminated-osc.mts");

test("stripVTControlCharacters is linear in unterminated OSC introducers", async () => {
  const dir = mkdtempSync(
    join(process.platform === "win32" ? tmpdir() : "/tmp", "scriptc-strip-vt-"),
  );
  try {
    const built = await compile(entry, {
      backend: "llvm",
      sanitize: process.env["SCRIPTC_SAN"] === "1",
      optimization: "dev",
      outDir: dir,
      outPath: join(dir, process.platform === "win32" ? "strip.exe" : "strip"),
    });
    if (!built.ok)
      throw new Error(built.diagnostics.map((d) => `${d.code}: ${d.message}`).join("\n"));
    for (const n of [100_000, 400_000]) {
      const run = spawnSync(built.binaryPath, [String(n)], { encoding: "utf8", timeout: 60_000 });
      expect(run.error).toBeUndefined();
      expect(run.status, run.stderr).toBe(0);
      const lines = run.stdout
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line) as { length: number; ms: number });
      expect(lines).toHaveLength(2);
      for (const line of lines) {
        // Nothing is removed: each 3-unit introducer stays.
        expect(line.length).toBe(3 * n);
        // A quadratic scan takes minutes at these sizes; a linear one, a
        // few milliseconds (the bound leaves room for sanitized builds).
        expect(line.ms).toBeLessThan(5_000);
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}, 180_000);
