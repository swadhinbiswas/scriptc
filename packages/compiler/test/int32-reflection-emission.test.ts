import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { compile } from "../src/index.js";

async function classLayout(reflection: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "scriptc-int32-reflection-"));
  try {
    const entry = join(dir, "main.ts");
    const outPath = join(dir, "main.ll");
    await writeFile(
      entry,
      `
class P {
  kind: number;
  pos: number;
  next: P | undefined;
  constructor(kind: number, pos: number) {
    this.kind = kind | 0;
    this.pos = pos | 0;
    this.next = undefined;
  }
}
function debug(x: unknown): string {
  if (typeof x !== "object" || x === null) return String(x);
  ${reflection}
}
const n = process.argv.length;
const p = new P(n, n * 2);
p.next = new P(1, 2);
if (n > 100) console.log(debug(p));
console.log(p.kind + p.pos);
`,
    );
    const result = await compile(entry, { outDir: dir, outPath, outputKind: "llvm" });
    expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
    const llvm = await readFile(outPath, "utf8");
    return /^%sc_o_P = type \{[^}]*\}/m.exec(llvm)?.[0] ?? "";
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("reflection that reads instances through unknown keeps their int32 fields", async () => {
  const layout = await classLayout(`
  let walked = "";
  for (const k in x) walked += k;
  console.log(x, typeof x, Object.prototype.toString.call(x), x.toString());
  console.log(Object.getOwnPropertyNames(x), Reflect.ownKeys(x), Object.hasOwn(x, "kind"));
  return [Object.keys(x), Object.values(x), Object.entries(x), walked].join(";");`);
  expect(layout).toMatch(/^%sc_o_P = type \{ i64, i32, i32, ptr/);
});

test("a computed store through unknown keeps the fields it can name as doubles", async () => {
  const layout = await classLayout(`
  (x as Record<string, unknown>)[String(Object.keys(x)[0])] = 1.5;
  return "";`);
  expect(layout).toMatch(/^%sc_o_P = type \{ i64, double, double, ptr/);
});
