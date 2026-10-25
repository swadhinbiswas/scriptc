import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test } from "vitest";
import { compile, deserializeModule, validateModule } from "../src/index.js";

const dirs: string[] = [];

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

function checkRecordReadReceivers(value: unknown, seen = new Set<object>()): number {
  if (value === null || typeof value !== "object") return 0;
  if (seen.has(value)) return 0;
  seen.add(value);
  if (Array.isArray(value)) {
    return value.reduce((count, item) => count + checkRecordReadReceivers(item, seen), 0);
  }
  const node = value as {
    kind?: unknown;
    obj?: { type?: { kind?: unknown; shapeId?: unknown } };
    shapeId?: unknown;
  };
  let reads = 0;
  if (node.kind === "recordGet" || node.kind === "recordKeyGet") {
    expect(node.obj?.type).toEqual({ kind: "record", shapeId: node.shapeId });
    reads++;
  }
  for (const child of Object.values(value)) reads += checkRecordReadReceivers(child, seen);
  return reads;
}

test("inline static record assertions reshape reads to the asserted representation", async () => {
  const dir = await mkdtemp(join(tmpdir(), "scriptc-inline-record-assertion-"));
  dirs.push(dir);
  const entry = join(dir, "main.ts");
  const outDir = join(dir, ".scriptc");
  const outPath = join(outDir, "main.ir.json");
  await writeFile(
    entry,
    [
      'const rec = { a: 1, b: "two" };',
      'console.log((rec as Record<string, unknown>)["a"]);',
      "const wide = { a: 3, b: 4 };",
      'console.log((wide as { a: number }).a, (wide as { a: number })["a"]);',
      "",
    ].join("\n"),
  );

  const result = await compile(entry, { outDir, outPath, outputKind: "ir" });
  if (!result.ok) {
    throw new Error(
      result.diagnostics
        .map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`)
        .join("\n"),
    );
  }

  const module = deserializeModule(await readFile(outPath, "utf8"));
  expect(validateModule(module)).toEqual([]);
  expect(checkRecordReadReceivers(module)).toBeGreaterThan(0);
});
