import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { compile, deserializeModule } from "../src/index.js";
import { emitLlvmModule } from "../src/backend/llvm/emitter.js";

test("counted loops guard exact induction and preserve wide remainders on both pointer widths", async () => {
  const dir = await mkdtemp(join(tmpdir(), "scriptc-counted-loops-"));
  try {
    const entry = join(import.meta.dirname, "../../../tests/corpus/counted-loop-numbers.ts");
    const outPath = join(dir, "numbers.ir.json");
    const result = await compile(entry, { outPath, outDir: dir, outputKind: "ir" });
    if (!result.ok) throw new Error(result.diagnostics.map((d) => d.message).join("\n"));
    const mod = deserializeModule(await readFile(outPath, "utf8"));
    const body = (ll: string, name: string): string =>
      ll.match(
        new RegExp(
          `define internal [^\\n]+ @sc_f_${name}(?:\\.i32)?\\([^\\n]*\\) #0 \\{([\\s\\S]*?)\\n\\}`,
        ),
      )![1]!;
    for (const pointerBits of [32, 64] as const) {
      const ll = emitLlvmModule(mod, { pointerBits, wasi: pointerBits === 32 });
      const exclusive = body(ll, "exclusive");
      expect(exclusive).toContain("counted.fast");
      expect(exclusive).toContain("counted.slow");
      expect(exclusive).toContain("fcmp ole double");
      expect(exclusive).toContain("alloca i64 ; integer induction i");
      const fast = exclusive.slice(exclusive.indexOf("\ncounted.fast"));
      expect(fast).toContain("urem i64");
      expect(fast).not.toContain("uint32.coerce");
      expect(body(ll, "inclusive")).toContain("fcmp ole double");
      expect(body(ll, "inclusive")).toContain("0x433FFFFFFFFFFFFF");
      expect(body(ll, "wide")).toMatch(/urem i64 %\w+, 4294967297/);
      for (const name of ["changed", "captured"])
        expect(body(ll, name)).not.toContain("counted.fast");
      expect(body(ll, "remainders")).toContain("frem double");
    }
    const debug = emitLlvmModule(mod, {
      debugSources: new Map([[entry, await readFile(entry, "utf8")]]),
    });
    expect(debug).not.toContain("counted.fast");
    expect(debug).toContain("@llvm.dbg.declare");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
