import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { compile, deserializeModule, serializeModule, validateModule } from "../src/index.js";
import { emitLlvmModule } from "../src/backend/llvm/emitter.js";
import { type IrModule } from "../src/ir/ir.js";

async function lower(source: string): Promise<IrModule> {
  const dir = await mkdtemp(join(tmpdir(), "scriptc-unassigned-fields-"));
  try {
    const entry = join(dir, "main.ts"),
      output = join(dir, "main.ir.json");
    await writeFile(entry, source);
    const result = await compile(entry, {
      outDir: dir,
      outPath: output,
      outputKind: "ir",
    });
    if (!result.ok)
      throw new Error(result.diagnostics.map((item) => `${item.code}: ${item.message}`).join("\n"));
    const module = deserializeModule(await readFile(output, "utf8"));
    expect(validateModule(module)).toEqual([]);
    return module;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function body(llvm: string, symbol: string): string {
  const found = new RegExp(`^define internal [^\\n]*@${symbol}(?:\\.i32)?\\([^]*?^}`, "m").exec(
    llvm,
  );
  expect(found, symbol).not.toBeNull();
  return found![0];
}

function fieldType(module: IrModule, className: string, field: string): string | undefined {
  return module.classes?.find((cls) => cls.name === className)?.fields.find((f) => f.name === field)
    ?.type.kind;
}

test("only fields read before their assignment check their slot", async () => {
  const module = await lower(`
class Part { size = 1; }
class Early {
  first: Part;
  second: Part;
  constructor() {
    this.first = new Part();
    Early.observe(this);
    this.second = new Part();
  }
  static observe(e: Early): void { console.log((e.second as Part | undefined) === undefined); }
  total(): number { return this.first.size + this.second.size; }
}
class Plain {
  first: Part;
  constructor() {
    this.first = new Part();
    this.describe();
  }
  describe(): void { console.log(this.first.size); }
}
console.log(new Early().total());
new Plain();
`);
  expect(fieldType(module, "Early", "first")).toBe("object");
  expect(fieldType(module, "Early", "second")).toBe("union");
  expect(fieldType(module, "Plain", "first")).toBe("object");
  const llvm = emitLlvmModule(deserializeModule(serializeModule(module)), { pointerBits: 64 });
  const total = body(llvm, "sc_bf__x25_Early_total");
  // The check is inline: no extraction call and no union box on the
  // assigned path.
  expect(total).not.toContain("@scr_union_new_ref");
  expect(total).not.toMatch(/call [^\n]*union_narrow/);
});
