import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { compileInChild } from "./self-hosting-compiler-process.js";

const root = join(import.meta.dirname, "../..");
const entry = join(root, "tests/fixtures/self-hosting/native-cache.ts");

test("native executable cache discovery, restoration and invalidation match Node", async () => {
  const directory = mkdtempSync(
    join(process.platform === "win32" ? tmpdir() : "/tmp", "scriptc-native-cache-"),
  );
  try {
    const built = await compileInChild(entry, {
      outDir: directory,
      outPath: join(directory, "cache" + (process.platform === "win32" ? ".exe" : "")),
      optimization: "dev",
      sanitize: process.env["SCRIPTC_SAN"] === "1",
    });
    if (!built.ok) throw new Error(JSON.stringify(built.diagnostics));
    const linker = join(directory, "linker.mjs");
    writeFileSync(linker, "console.error(JSON.stringify(process.argv[2]));\n");
    const sdk = join(directory, "sdk");
    mkdirSync(sdk);
    const library = join(sdk, "system library.tbd");
    const results: string[] = [];
    for (const native of [false, true]) {
      const stage = join(directory, native ? "native" : "node");
      mkdirSync(stage);
      writeFileSync(library, "system library");
      const args = [stage, process.execPath, linker, library];
      const result = spawnSync(
        native ? built.binaryPath : process.execPath,
        native ? args : ["--import", "tsx", entry, ...args],
        {
          cwd: root,
          encoding: "utf8",
          timeout: 30_000,
          env: { ...process.env, ...(native ? { PATH: "" } : {}) },
        },
      );
      expect(result.error).toBeUndefined();
      expect(result.signal, result.stderr).toBeNull();
      expect(result.status, result.stderr + result.stdout).toBe(0);
      expect(result.stderr).toBe("");
      expect(result.stdout).toContain("true\ntrue\ncached program\nfalse\n");
      results.push(result.stdout);
    }
    expect(results[1]).toBe(results[0]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}, 300_000);
