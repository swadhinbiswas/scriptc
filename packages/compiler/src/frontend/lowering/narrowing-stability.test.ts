import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { compile, deserializeModule, validateModule } from "../../index.js";
import type { IrModule } from "../../ir/ir.js";

async function lower(source: string): Promise<IrModule> {
  const dir = await mkdtemp(join(tmpdir(), "scriptc-narrowing-stability-"));
  try {
    const entry = join(dir, "main.ts"),
      output = join(dir, "main.ir.json");
    await writeFile(entry, source);
    const result = await compile(entry, { outDir: dir, outPath: output, outputKind: "ir" });
    if (!result.ok)
      throw new Error(result.diagnostics.map((item) => `${item.code}: ${item.message}`).join("\n"));
    const module = deserializeModule(await readFile(output, "utf8"));
    expect(validateModule(module)).toEqual([]);
    return module;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** The TypeError messages a function's checked reads can throw. */
function thrownMessages(module: IrModule, name: string): string[] {
  const fn = module.functions.find((f) => f.name === name || f.name.endsWith(`.${name}`));
  if (!fn) throw new Error(`no function ${name}`);
  const messages: string[] = [];
  JSON.stringify(fn.body, (_key, value: unknown) => {
    const node = value as { kind?: string; fn?: string; args?: { value?: unknown }[] };
    if (node?.kind === "libCall" && node.fn === "error.nodeThrow")
      messages.push(String(node.args?.[2]?.value));
    return value;
  });
  return messages;
}

const SOURCE = `
class Tree {
  parent: Tree | undefined;
  depth: number;
  constructor(parent: Tree | undefined) {
    this.parent = parent;
    this.depth = parent ? parent.depth + 1 : 0;
  }
}
class Box {
  label: string | undefined = undefined;
  clear(): void { this.label = undefined; }
}
function visit(t: Tree): number { return t.depth; }
function constructionOnly(t: Tree): number {
  if (t.parent) {
    visit(t);
    return t.parent.depth;
  }
  return -1;
}
function noCall(b: Box): number {
  if (b.label !== undefined) return b.label.length + b.label.length;
  return 0;
}
function libraryCalls(b: Box, xs: number[]): number {
  if (b.label !== undefined) {
    xs.push(Math.max(1, 2));
    console.log("x");
    return b.label.length;
  }
  return 0;
}
function userCall(b: Box): number {
  if (b.label !== undefined) {
    visit(new Tree(undefined));
    return b.label.length;
  }
  return 0;
}
function methodCall(b: Box): number {
  if (b.label !== undefined) {
    b.clear();
    return b.label.length;
  }
  return 0;
}
function loopBackEdge(b: Box): number {
  let n = 0;
  if (b.label !== undefined) {
    for (let i = 0; i < 2; i++) {
      n += b.label.length;
      b.clear();
    }
  }
  return n;
}
const b = new Box();
b.label = "abc";
console.log(constructionOnly(new Tree(new Tree(undefined))), noCall(b), libraryCalls(b, []),
  userCall(b), methodCall(b), loopBackEdge(b));
`;

test("narrowed reads keep the unchecked extraction where nothing can change the field", async () => {
  const module = await lower(SOURCE);
  expect(thrownMessages(module, "constructionOnly")).toEqual([]);
  expect(thrownMessages(module, "noCall")).toEqual([]);
  expect(thrownMessages(module, "libraryCalls")).toEqual([]);
});

test("narrowed reads after code that can clear the field check it with Node's TypeError", async () => {
  const module = await lower(SOURCE);
  const read = "Cannot read properties of undefined (reading 'length')";
  expect(thrownMessages(module, "userCall")).toContain(read);
  expect(thrownMessages(module, "methodCall")).toContain(read);
  expect(thrownMessages(module, "loopBackEdge")).toContain(read);
});

test("standard-library arguments read as declared only where the lowering is generic", async () => {
  // JSON.stringify and clearInterval lower only the narrowed argument types;
  // console methods and type-parameter slots take the declared value.
  const module = await lower(`
interface Opts {
  p?: { [k: string]: number };
}
function touch(): number {
  return 1;
}
let handle: ReturnType<typeof setInterval> | null = null;
const stop = (): void => {
  handle = null;
};
function specialized(o: Opts): string {
  o.p = { a: 1 };
  touch();
  return JSON.stringify(o.p);
}
function clearAfterCall(): void {
  if (handle !== null) {
    touch();
    clearInterval(handle);
  }
}
function formatted(o: Opts, out: (Opts["p"])[]): void {
  o.p = { a: 2 };
  touch();
  console.log(o.p);
  out.push(o.p);
}
handle = setInterval(() => {}, 1000);
console.log(specialized({}));
clearAfterCall();
stop();
formatted({}, []);
`);
  expect(thrownMessages(module, "formatted")).toEqual([]);
});
