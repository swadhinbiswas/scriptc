import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { compile, deserializeModule } from "../src/index.js";
import { emitLlvmModule } from "../src/backend/llvm/emitter.js";
import type { IrModule } from "../src/ir/ir.js";

async function lowerSource(source: string): Promise<IrModule> {
  const dir = await mkdtemp(join(tmpdir(), "scriptc-size-conversions-"));
  try {
    const entry = join(dir, "main.ts");
    await writeFile(entry, source);
    const outPath = join(dir, "main.ir.json");
    const result = await compile(entry, { outPath, outDir: dir, outputKind: "ir" });
    if (!result.ok) throw new Error(result.diagnostics.map((d) => d.message).join("\n"));
    return deserializeModule(await readFile(outPath, "utf8"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("array lengths past 2^31 convert unsigned on 32-bit targets", async () => {
  // A sparse write at index 2^32 - 2 leaves the length at 2^32 - 1, past a
  // 32-bit size_t's sign bit.
  const mod = await lowerSource(
    "const numbers = [1];\nnumbers[4294967294] = 2;\nconsole.log(numbers.length);\n",
  );
  const wasm = emitLlvmModule(mod, { wasi: true, pointerBits: 32 });
  expect(wasm).toMatch(/uitofp i32 %\w+ to double/);
  expect(wasm).not.toMatch(/sitofp i32 %\w+ to double/);
  const native = emitLlvmModule(mod, { pointerBits: 64 });
  expect(native).toMatch(/sitofp i64 %\w+ to double/);
  expect(native).not.toMatch(/uitofp i64/);
});
