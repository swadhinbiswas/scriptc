import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { compile } from "../src/index.js";

async function compileSource(source: string) {
  const directory = mkdtempSync(join(tmpdir(), "scriptc-fs-glob-"));
  try {
    const entry = join(directory, "main.ts");
    writeFileSync(entry, source);
    return await compile(entry, {
      outDir: directory,
      outPath: join(directory, "program.ir"),
      outputKind: "ir",
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

// Forms whose result type or element values have no native representation
// fail during compilation.
test.each([
  [
    "fs/promises glob outside a for await loop",
    'import { glob } from "node:fs/promises";\nconst matches = glob("*");\nvoid matches;\n',
  ],
])("%s fails during compilation", async (what, source) => {
  const result = await compileSource(source);
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("expected an fs.glob diagnostic");
  expect(result.diagnostics).toEqual(
    expect.arrayContaining([expect.objectContaining({ message: expect.stringContaining(what) })]),
  );
  expect(result.diagnostics.some((diagnostic) => diagnostic.code === "SC9001")).toBe(false);
});

test("the fs.glob forms compile", async () => {
  const result = await compileSource(`import { globSync, glob as globCallback } from "node:fs";
import { glob } from "node:fs/promises";
console.log(globSync("**/*.ts", { cwd: ".", exclude: ["node_modules/**"] }).length);
console.log(globSync(["*.md"], { exclude: (path) => path.startsWith(".") }).length);
console.log(globSync("*", { withFileTypes: true }).map((d) => d.isFile()).length);
globCallback("*", (err, matches) => console.log(err, matches?.length));
async function main(): Promise<void> {
  for await (const path of glob("*")) console.log(path);
  for await (const entry of glob("*", { withFileTypes: true })) console.log(entry.name, entry.isDirectory());
}
void main();
`);
  expect(result.ok, JSON.stringify(result.ok ? [] : result.diagnostics)).toBe(true);
});
