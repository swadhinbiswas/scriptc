import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { compileInChild } from "./self-hosting-compiler-process.js";

test("native class type cleanup updates shared IR without dynamic snapshots", async () => {
  const root = join(import.meta.dirname, "../..");
  const entry = join(root, "tests/fixtures/self-hosting/class-types.ts");
  const directory = mkdtempSync(
    join(process.platform === "win32" ? tmpdir() : "/tmp", "scriptc-class-types-"),
  );
  try {
    const built = await compileInChild(entry, {
      outDir: directory,
      outPath: join(directory, "class-types" + (process.platform === "win32" ? ".exe" : "")),
      optimization: "dev",
      sanitize: process.env["SCRIPTC_SAN"] === "1",
    });
    if (!built.ok) throw new Error(JSON.stringify(built.diagnostics));
    const options = { cwd: root, encoding: "utf8" as const, timeout: 30_000 };
    const oracle = spawnSync(process.execPath, ["--import", "tsx", entry], options);
    const native = spawnSync(built.binaryPath, [], options);
    for (const result of [oracle, native]) {
      expect(result.error).toBeUndefined();
      expect(result.signal, result.stderr).toBeNull();
      expect(result.status, result.stderr).toBe(0);
      expect(result.stderr).toBe("");
    }
    expect(native.stdout).toBe(oracle.stdout);
    expect(native.stdout).toMatch(/^f64 f64\n/);
    expect(native.stdout).toContain("false 1024\ntrue true true false\n");
    expect(native.stdout).toMatch(/object object f64\nf64\n$/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}, 300_000);
