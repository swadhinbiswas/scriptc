import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { analyze, compile } from "../src/index.js";

test("Map iterator construction refuses different reference layouts", () => {
  const dir = mkdtempSync(join(tmpdir(), "scriptc-map-iterator-layout-"));
  try {
    const entry = join(dir, "main.ts");
    writeFileSync(
      entry,
      `
      const records = new Map<string, { id: number; label: string }>();
      console.log(new Map<string, { id: number }>(records.entries()).size);
    `,
    );
    const { coverage } = analyze(entry, {});
    expect(coverage.preflightFailed).toBe(false);
    expect(coverage.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "SC2020",
          message: expect.stringContaining("new Map(entries)"),
        }),
      ]),
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("array and Map consumers validate hidden reference layouts before exposing values", async () => {
  const dir = mkdtempSync(join(tmpdir(), "scriptc-collection-layout-"));
  try {
    const entry = join(dir, "main.ts");
    writeFileSync(
      entry,
      `
      interface Key { id: number }
      const wide = { id: 1, label: "original" };
      const source = new Map<string, typeof wide>([["key", wide]]);
      const values: MapIterator<Key> = source.values();
      const mapped: MapIterator<Key> = source.values();
      const entries: MapIterator<[string, Key]> = source.entries();
      const unused: MapIterator<Key> = source.values();
      let calls = 0;
      try { Array.from(values); } catch (error) {
        console.log("array", error instanceof TypeError, String(error).includes("original layout"));
      }
      try { Array.from(mapped, value => { calls++; return value; }); } catch (error) {
        console.log("mapper", error instanceof TypeError, String(error).includes("original layout"));
      }
      try { Array.from(unused, () => { calls++; return 1; }); } catch (error) {
        console.log("unused", error instanceof TypeError, String(error).includes("original layout"));
      }
      try { new Map(entries); } catch (error) {
        console.log("map", error instanceof TypeError, String(error).includes("original layout"));
      }
      console.log("source", source.get("key") === wide, wide.label, calls);
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
      "array true true\nmapper true true\nunused true true\nmap true true\nsource true original 0\n",
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
