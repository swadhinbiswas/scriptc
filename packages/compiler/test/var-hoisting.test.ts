import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test } from "vitest";
import { compile } from "../src/index.js";
import type { IrModule, IrType } from "../src/ir/ir.js";

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(directories.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function lower(source: string, file = "main.ts"): Promise<IrModule> {
  const outDir = await mkdtemp(join(tmpdir(), "scriptc-var-hoisting-"));
  directories.push(outDir);
  const entry = join(outDir, file);
  await writeFile(entry, source);
  const outPath = join(outDir, "program.ir");
  const result = await compile(entry, { entry, outDir, outPath, outputKind: "ir" });
  expect(result.ok, JSON.stringify(result)).toBe(true);
  return JSON.parse(await readFile(outPath, "utf8")) as IrModule;
}

function globalType(mod: IrModule, name: string): IrType["kind"] | undefined {
  return mod.globals?.find((g) => g.name === name)?.type.kind;
}

test("only vars readable before their first store get undefined-armed storage", async () => {
  const mod = await lower(`
function early(): number { return late; }
console.log(early());
var late = 5;
var settled = 1;
function read(): number { return settled; }
console.log(read(), early());
for (var i = 0; i < 2; i++) settled += i;
console.log(i);
`);
  expect(globalType(mod, "late")).toBe("union");
  expect(globalType(mod, "settled")).toBe("f64");
  expect(globalType(mod, "i")).toBe("f64");
});

test("a hoisted function counts as early only when a call can run first", async () => {
  const mod = await lower(`
var before = 1;
console.log(after());
var later = 2;
function after(): number { return before + later; }
console.log(after());
`);
  expect(globalType(mod, "before")).toBe("f64");
  expect(globalType(mod, "later")).toBe("union");
});

test("JavaScript loop and initialized vars keep plain storage", async () => {
  const mod = await lower(
    `
var count = 0;
for (var i = 0; i < 3; i++) count += i;
for (var key in { a: 1 }) count += key.length;
function read() { return count + i; }
console.log(read());
`,
    "main.js",
  );
  expect(globalType(mod, "count")).toBe("f64");
  expect(globalType(mod, "i")).toBe("f64");
});
