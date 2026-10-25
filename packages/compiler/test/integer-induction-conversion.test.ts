import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { compile, deserializeModule } from "../src/index.js";
import { emitLlvmModule } from "../src/backend/llvm/emitter.js";

test("array index counters convert to and from numbers with signed conversions on 64-bit targets", async () => {
  const dir = await mkdtemp(join(tmpdir(), "scriptc-integer-induction-"));
  try {
    const entry = join(dir, "main.ts");
    const outPath = join(dir, "main.ir.json");
    const source = `
function weigh(values: number[]): number {
  let total = 0;
  for (let i = 0; i < values.length; i++) {
    for (let j = i + 1; j < values.length; j++) total += (i / 2) * values[j]! + j;
  }
  return total;
}
console.log(weigh([1, 2, 3, 4]));
`;
    await writeFile(entry, source);
    const result = await compile(entry, { outDir: dir, outPath, outputKind: "ir" });
    if (!result.ok)
      throw new Error(result.diagnostics.map((d) => `${d.code}: ${d.message}`).join("\n"));
    const mod = deserializeModule(await readFile(outPath, "utf8"));
    const body = (ll: string): string =>
      ll.match(
        /define internal [^\n]+ @sc_(?:b)?f_weigh(?:\.i32)?\([^\n]*\) #0 \{([\s\S]*?)\n\}/,
      )![1]!;

    const wide = body(emitLlvmModule(mod));
    expect(wide).toContain("integer induction");
    // Both counters are read as numbers (i / 2, + j): safe integers, so the
    // signed conversion is exact; the nested start converts back the same way.
    expect(wide).toMatch(/ = sitofp i64 %\w+ to double/);
    expect(wide).not.toMatch(/ = uitofp i64 /);
    expect(wide).toMatch(/ = fptosi double %\w+ to i64/);
    expect(wide).not.toMatch(/ = fptoui double %\w+ to i64/);

    // 32-bit counters reach 2^32 - 2, beyond the signed i32 range.
    const narrow = body(emitLlvmModule(mod, { pointerBits: 32, wasi: true }));
    expect(narrow).toMatch(/ = uitofp i32 %\w+ to double/);
    expect(narrow).toMatch(/ = fptoui double %\w+ to i32/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
