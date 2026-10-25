import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { compile } from "../src/index.js";

async function emit(body: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "scriptc-live-view-commit-"));
  try {
    const entry = join(dir, "main.ts");
    const outPath = join(dir, "main.ll");
    await writeFile(
      entry,
      `
class Node {
  kind: number;
  next: Node | undefined;
  data: { label: string; size: number };
  constructor(kind: number) {
    this.kind = kind;
    this.next = undefined;
    this.data = { label: "n" + kind, size: kind };
  }
}
function debug(x: unknown): string {
  if (typeof x !== "object" || x === null) return String(x);
  ${body}
}
const n = new Node(process.argv.length);
n.next = new Node(2);
console.log(debug(n));
`,
    );
    const result = await compile(entry, { outDir: dir, outPath, outputKind: "llvm" });
    expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
    return await readFile(outPath, "utf8");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("class and record views commit nothing when no dynamic store exists", async () => {
  const llvm = await emit(`return Object.keys(x).join(",") + JSON.stringify(Object.values(x));`);
  expect(llvm).toMatch(/define internal ptr @sc_ldr_\d+_materialize\(/);
  expect(llvm).not.toMatch(/define internal void @sc_ldr_\d+_materialize_commit\(/);
});

test("a dynamic store keeps the commits of class and record views", async () => {
  const llvm = await emit(`(x as Record<string, unknown>)["kind"] = 1.5;
  return Object.keys(x).join(",");`);
  expect(llvm).toMatch(/define internal void @sc_ldr_\d+_materialize_commit\(/);
});
