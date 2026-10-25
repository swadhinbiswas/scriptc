import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { compile, deserializeModule } from "../src/index.js";
import { emitLlvmModule } from "../src/backend/llvm/emitter.js";

async function emit(source: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "scriptc-input-emission-"));
  try {
    const entry = join(dir, "main.ts"),
      output = join(dir, "main.json");
    await writeFile(entry, source);
    const result = await compile(entry, {
      outDir: dir,
      outPath: output,
      outputKind: "ir",
    });
    if (!result.ok) throw new Error(result.diagnostics.map((d) => d.message).join("\n"));
    return emitLlvmModule(deserializeModule(await readFile(output, "utf8")));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
function body(llvm: string, name: string): string {
  const found = new RegExp(
    `^define internal [^\\n]*@sc_(?:b)?f_${name}(?:\\.i32)?\\([^]*?^}`,
    "m",
  ).exec(llvm);
  expect(found, name).not.toBeNull();
  return found![0];
}

test("nested field arguments borrow through preserving helpers and snapshot across replacement", async () => {
  const llvm = await emit(`
class Cell { text: string; constructor(text: string) { this.text = text; } }
class Holder { cell: Cell; constructor(cell: Cell) { this.cell = cell; } }
function read(cell: Cell): string { return cell.text; }
function preserve(holder: Holder): string { return read(holder.cell); }
function replace(cell: Cell, holder: Holder): string { holder.cell = new Cell("new"); return cell.text; }
function snapshot(holder: Holder): string { return replace(holder.cell, holder); }
const holder = new Holder(new Cell("old"));
console.log(preserve(holder), snapshot(holder));
`);
  expect(body(llvm, "preserve")).not.toContain("@sc_retain_Cell");
  expect(body(llvm, "preserve")).not.toContain("@sc_release_Cell");
  expect(body(llvm, "snapshot")).toContain("@sc_retain_Cell");
  expect(body(llvm, "snapshot")).toContain("@sc_release_Cell");
  // `read` returns a projection of its borrowed parameter without a
  // reference; its owned adapter takes one for callers outside direct calls.
  expect(body(llvm, "read")).not.toContain("@scr_str_retain_v");
  expect(/^define internal [^\n]*@sc_f_read(?:\.i32)?\([^]*?^}/m.exec(llvm)?.[0]).toContain(
    "@scr_str_retain_v",
  );
});

test("regex runtime inputs borrow independently of result ownership and lastIndex mutation", async () => {
  const llvm = await emit(`
class Input { pattern: RegExp; text: string; constructor() { this.pattern = /a/g; this.text = "abc"; } }
function test(input: Input): boolean { return input.pattern.test(input.text); }
function replace(input: Input): string { return input.text.replace(input.pattern, "x"); }
const input = new Input(); console.log(test(input), replace(input));
`);
  for (const name of ["test", "replace"]) {
    expect(body(llvm, name)).not.toMatch(/@scr_(regex|str)_retain_v/);
    expect(body(llvm, name)).toContain(`@scr_regex_${name}`);
  }
});

test("literal owners transfer into stores and returns without runtime retain calls", async () => {
  const llvm = await emit(`
function value(): string { return "literal"; }
function values(): string[] { return ["same", "same", "different"]; }
function choose(flag: boolean): string | undefined { return flag ? "text" : undefined; }
console.log(value(), values().join("|"), choose(false));
`);
  for (const name of ["value", "values", "choose"]) {
    expect(body(llvm, name)).not.toContain("call ptr @scr_str_retain_v");
    expect(body(llvm, name)).not.toContain("call void @scr_str_release");
  }
  expect(body(llvm, "values")).toContain("@sc_lit_");
});

test("checked scalar and union comparisons borrow projections but snapshot later writes", async () => {
  const llvm = await emit(`
type Holder = { value: unknown; choice: string | number };
function scalar(holder: Holder): boolean { return holder.value === "first"; }
function truth(holder: Holder): boolean { return !!holder.value; }
function union(holder: Holder): boolean { return holder.choice === holder.choice; }
function replace(holder: Holder): unknown { holder.value = "second"; return holder.value; }
function snapshot(holder: Holder): boolean { return holder.value === replace(holder); }
const holder: Holder = { value: "first", choice: "first" }; console.log(scalar(holder), truth(holder), union(holder), snapshot(holder));
`);
  for (const name of ["scalar", "truth"]) {
    expect(body(llvm, name)).not.toContain("@scr_dyn_retain_v");
    expect(body(llvm, name)).not.toContain("@scr_dyn_release");
  }
  expect(body(llvm, "union")).not.toContain("@scr_union_retain_v");
  expect(body(llvm, "snapshot")).toContain("@scr_dyn_retain_v");
  expect(body(llvm, "snapshot")).toContain("@scr_dyn_release");
});

test("checked conversion and serialization borrow stable inputs and own their results", async () => {
  const llvm = await emit(`
function box(value: string): unknown { return value; }
function check(value: unknown): string { return value as string; }
function render(value: unknown): string { return JSON.stringify(value); }
console.log(check(box("text")), render(box("text")));
`);
  expect(body(llvm, "box")).not.toContain("@scr_str_retain_v");
  for (const name of ["check", "render"]) {
    expect(body(llvm, name)).not.toMatch(/load ptr[^\n]*\n[^\n]*call ptr @scr_dyn_retain_v/);
    expect(body(llvm, name)).toContain("ret ptr");
  }
  expect(body(llvm, "render")).toContain("@scr_json_stringify_replacer");
});
