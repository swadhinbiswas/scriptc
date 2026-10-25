import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { analyze, compile } from "../src/index.js";

test("Set iterator seeds refuse different declared reference layouts", () => {
  const dir = mkdtempSync(join(tmpdir(), "scriptc-set-iterator-layout-"));
  try {
    const entry = join(dir, "main.ts");
    writeFileSync(
      entry,
      `
      const records = new Map<string, { id: number; label: string }>();
      console.log(new Set<{ id: number }>(records.values()).size);
    `,
    );
    const { coverage } = analyze(entry, {});
    expect(coverage.preflightFailed).toBe(false);
    expect(coverage.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "SC2020",
          message: expect.stringContaining("new Set(values)"),
        }),
      ]),
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("Set iterator seeds cannot hide identity copies behind annotations", async () => {
  const dir = mkdtempSync(join(tmpdir(), "scriptc-set-iterator-identity-"));
  try {
    const entry = join(dir, "main.ts");
    writeFileSync(
      entry,
      `
      interface Key { id: number }
      const wide = { id: 1, label: "original" };
      const source = new Map<string, typeof wide>([["key", wide]]);
      const record: MapIterator<Key> = source.values();
      const union: MapIterator<Key | number[]> = source.values();
      const tuple: MapIterator<[string, Key]> = source.entries();
      const arrays = new Map<string, (typeof wide)[]>([["array", [wide]]]);
      const array: MapIterator<Key[]> = arrays.values();
      try { new Set(record); } catch (error) {
        console.log("record", error instanceof TypeError, String(error).includes("original layout"));
      }
      try { new Set(union); } catch (error) {
        console.log("union", error instanceof TypeError, String(error).includes("original layout"));
      }
      try { new Set(tuple); } catch (error) {
        console.log("tuple", error instanceof TypeError, String(error).includes("original layout"));
      }
      try { new Set(array); } catch (error) {
        console.log("array", error instanceof TypeError, String(error).includes("original layout"));
      }
      console.log("source", source.get("key") === wide, wide.label);
    `,
    );
    const result = await compile(entry, {
      optimization: "dev",
      sanitize: process.env["SCRIPTC_SAN"] === "1",
      outDir: dir,
      outPath: join(dir, process.platform === "win32" ? "test.exe" : "test"),
    });
    if (!result.ok)
      throw new Error(result.diagnostics.map((diagnostic) => diagnostic.message).join("\n"));
    expect(execFileSync(result.binaryPath, { encoding: "utf8", timeout: 10_000 })).toBe(
      "record true true\nunion true true\ntuple true true\narray true true\nsource true original\n",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
