import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { compile } from "../src/index.js";

test("generic protocol dispatch without a concrete body calls the erased method", async () => {
  const directory = mkdtempSync(join(tmpdir(), "scriptc-protocol-boundary-"));
  try {
    const entry = join(directory, "main.ts");
    writeFileSync(
      entry,
      `interface Live { value(): number; identity<T>(value: T): T; }
class Value implements Live {
  value(): number { return 1; }
  identity<T>(value: T): T { return value; }
}
function read(value: Live): number { return value.identity(3); }
console.log(read(new Value()));`,
    );
    const result = await compile(entry, {
      outDir: directory,
      outPath: join(directory, "program.ir"),
      outputKind: "ir",
    });
    if (!result.ok)
      throw new Error(result.diagnostics.map((d) => `${d.code}: ${d.message}`).join("\n"));
    expect(result.ok).toBe(true);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
