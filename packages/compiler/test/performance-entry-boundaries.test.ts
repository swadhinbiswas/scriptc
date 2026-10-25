import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { compile } from "../src/index.js";

// Node keeps a performance entry's fields as prototype getters, so the
// own-key walks over an entry fence instead of listing the fields.
test.each([
  ["Object.keys", "console.log(Object.keys(mark));"],
  ["Object.entries", "console.log(Object.entries(mark));"],
  ["for-in", "for (const key in mark) console.log(key);"],
  ["object spread", "console.log({ ...mark });"],
  ["Object.prototype.hasOwnProperty", 'console.log(mark.hasOwnProperty("name"));'],
])("%s over a performance entry fails during compilation", async (what, use) => {
  const directory = mkdtempSync(join(tmpdir(), "scriptc-perf-entry-"));
  try {
    const entry = join(directory, "main.ts");
    writeFileSync(entry, `const mark = performance.mark("a", { startTime: 1 });\n${use}\n`);
    const result = await compile(entry, {
      outDir: directory,
      outPath: join(directory, "program.ir"),
      outputKind: "ir",
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected a performance entry diagnostic");
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "SC1090",
          message: expect.stringContaining(`${what} over performance entries`),
        }),
      ]),
    );
    expect(result.diagnostics.some((diagnostic) => diagnostic.code === "SC9001")).toBe(false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("the entry field reads and toJSON compile", async () => {
  const directory = mkdtempSync(join(tmpdir(), "scriptc-perf-entry-"));
  try {
    const entry = join(directory, "main.ts");
    writeFileSync(
      entry,
      `const mark = performance.mark("a", { startTime: 1 });
const json = mark.toJSON() as { name: string };
console.log(mark.name, mark.entryType, mark.startTime, mark.duration, mark.detail, json.name);
console.log(String(mark), \`\${mark}\`, Object.keys(mark.toJSON() as object));
`,
    );
    const result = await compile(entry, {
      outDir: directory,
      outPath: join(directory, "program.ir"),
      outputKind: "ir",
    });
    expect(result.ok, JSON.stringify(result.ok ? [] : result.diagnostics)).toBe(true);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
