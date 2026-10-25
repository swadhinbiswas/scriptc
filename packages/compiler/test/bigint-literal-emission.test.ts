import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { compile, deserializeModule } from "../src/index.js";
import { emitLlvmModule } from "../src/backend/llvm/emitter.js";

test("bigint literals are immortal statics with pointer-sized limbs", async () => {
  const dir = await mkdtemp(join(tmpdir(), "scriptc-bigint-literals-"));
  try {
    const entry = join(import.meta.dirname, "../../../tests/corpus/4902-bigint-compound-assign.ts");
    const outPath = join(dir, "main.ir.json");
    const result = await compile(entry, { outDir: dir, outPath, outputKind: "ir" });
    if (!result.ok)
      throw new Error(result.diagnostics.map((d) => `${d.code}: ${d.message}`).join("\n"));
    const mod = deserializeModule(await readFile(outPath, "utf8"));
    for (const pointerBits of [32, 64] as const) {
      const ll = emitLlvmModule(mod, { pointerBits, wasi: pointerBits === 32 });
      const size = pointerBits === 64 ? "i64" : "i32";
      // 0xcbf29ce484222325n: one 64-bit limb, or two 32-bit limbs.
      const fnv =
        pointerBits === 64
          ? `[1 x i64] [i64 ${0xcbf29ce484222325n}]`
          : `[2 x i32] [i32 ${0x84222325n}, i32 ${0xcbf29ce4n}]`;
      expect(ll).toContain(
        `{ ${size} -1, ${size} ${pointerBits === 64 ? 1 : 2}, i32 1, i32 ${pointerBits === 64 ? 1 : 2}, ${fnv} }`,
      );
      // Every literal in the program folds; nothing parses literal text.
      expect(ll).not.toMatch(/call ptr @scr_bigint_parse\(/);
      // `++`/`+=` lower to the runtime operators instead of a diagnostic.
      expect(ll).toContain("@scr_bigint_add(");
      expect(ll).toContain("@scr_bigint_pow(");
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("fixed-width bigint trees run in i64 with an exact fallback", async () => {
  const dir = await mkdtemp(join(tmpdir(), "scriptc-bigint-wrap-"));
  try {
    const entry = join(
      import.meta.dirname,
      "../../../tests/corpus/4905-bigint-fixed-width-fusion.ts",
    );
    const outPath = join(dir, "main.ir.json");
    const result = await compile(entry, { outDir: dir, outPath, outputKind: "ir" });
    if (!result.ok)
      throw new Error(result.diagnostics.map((d) => `${d.code}: ${d.message}`).join("\n"));
    const mod = deserializeModule(await readFile(outPath, "utf8"));
    for (const pointerBits of [32, 64] as const) {
      const ll = emitLlvmModule(mod, { pointerBits, wasi: pointerBits === 32 });
      expect(ll).toContain("bigint.wrap.fast");
      expect(ll).toMatch(/mul i64 %t\d+, 1099511628211/);
      expect(ll).toContain("@scr_bigint_wrap_eval(");
      expect(ll).toContain("@scr_bigint_from_u64(i64");
      expect(ll).toContain("@scr_bigint_from_i64(i64");
      expect(ll).toContain("@scr_bigint_from_mag64(i64");
      expect(ll).toContain("@llvm.umul.with.overflow.i64");
      // 64-bit targets read len/sign/limb 0 inline; 32-bit ones call out.
      if (pointerBits === 64) expect(ll).not.toContain("@scr_bigint_mag64(");
      else expect(ll).toContain("@scr_bigint_mag64(");
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
