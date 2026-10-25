import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compile } from "@scriptc/compiler";
import { expect, test } from "vitest";

const root = join(import.meta.dirname, "../..");
const entry = join(root, "tests/fixtures/npm/cases/process-argv.mts");
const args = [
  "",
  "héllo",
  "中文",
  "🌍",
  "a b",
  'double"quote',
  "end\\",
  'slashes\\\\"quote',
  "&;$(hello)`test'",
  "line\nbreak",
  "tab\targ",
];

for (const backend of ["llvm"] as const) {
  test(`native process.argv preserves Unicode, quoting, empty values and identity (${backend})`, async () => {
    const dir = mkdtempSync(
      join(process.platform === "win32" ? tmpdir() : "/tmp", "scriptc-argv-native-"),
    );
    try {
      const built = await compile(entry, {
        backend,
        sanitize: process.env["SCRIPTC_SAN"] === "1",
        optimization: "dev",
        outDir: dir,
        outPath: join(dir, process.platform === "win32" ? "argv.exe" : "argv"),
      });
      if (!built.ok)
        throw new Error(built.diagnostics.map((d) => `${d.code}: ${d.message}`).join("\n"));
      const oracle = spawnSync(process.execPath, [entry, ...args], {
        encoding: "utf8",
        timeout: 10_000,
      });
      const native = spawnSync(built.binaryPath, args, { encoding: "utf8", timeout: 10_000 });
      expect(oracle.error).toBeUndefined();
      expect(oracle.status, oracle.stderr).toBe(0);
      expect(oracle.stdout).toBe(`${JSON.stringify(args)}\ntrue\n追加\n`);
      expect(native.error).toBeUndefined();
      expect(native.status, native.stderr).toBe(oracle.status);
      expect(native.stdout).toBe(oracle.stdout);
      expect(native.stderr).toBe(oracle.stderr);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}
