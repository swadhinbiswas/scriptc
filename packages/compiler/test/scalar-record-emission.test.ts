import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { compile, deserializeModule, validateModule } from "../src/index.js";
import { emitLlvmModule } from "../src/backend/llvm/emitter.js";
import { scalarizeNumericRecords } from "../src/ir/scalar-records.js";

test("LLVM scalarize ordinary typed calls while preserving producers with finally", async () => {
  const dir = await mkdtemp(join(tmpdir(), "scriptc-scalar-record-emission-"));
  try {
    const entry = join(dir, "main.ts");
    const outPath = join(dir, "main.ir.json");
    await writeFile(
      entry,
      `
function pair(x: number): { a: number; b: number } {
  for (let i = 0; i < 3; i++) {
    if (i === x) return { b: i * 2, a: i };
  }
  return { a: -1, b: -2 };
}
function guarded(): { a: number; b: number } {
  try { return { a: 1, b: 2 }; } finally { console.log("finally"); }
}
function render(): void {
  const p = pair(2);
  console.log(p.a, p.b);
  const g = guarded();
  console.log(g.a);
}
render();
`,
    );
    const result = await compile(entry, { outDir: dir, outPath, outputKind: "ir" });
    if (!result.ok)
      throw new Error(result.diagnostics.map((d) => `${d.code}: ${d.message}`).join("\n"));
    const mod = deserializeModule(await readFile(outPath, "utf8"));
    const out = scalarizeNumericRecords(mod);
    expect(validateModule(mod)).toEqual([]);
    expect(validateModule(out)).toEqual([]);
    const render = out.functions.find((fn) => fn.name === "render")!;
    expect(render.locals.filter((l) => l.type.kind === "record").map((l) => l.name)).toEqual(["g"]);

    const llvm = emitLlvmModule(mod);

    expect(llvm).not.toMatch(/call ptr @sc_f_pair\(/);

    expect(llvm).toMatch(/call ptr @sc_f_guarded\(/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
