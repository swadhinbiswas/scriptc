import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { expect, test } from "vitest";
import { compile } from "@scriptc/compiler";

const exec = promisify(execFile);

for (const backend of ["llvm"] as const) {
  test(`weak collections keep engine identity in dynamic builds (${backend})`, async () => {
    const outDir = await mkdtemp(join(tmpdir(), "scriptc-weak-island-"));
    try {
      const entry = join(outDir, "main.ts");
      await writeFile(
        entry,
        `
const key: any = { value: 1 };
const other: any = { value: 1 };
const map = new WeakMap<object, number>();
const set = new WeakSet<object>([key]);
console.log(map.set(key, 3) === map, set.add(other) === set);
console.log(String(map.get(key)), String(map.get(other)), String(set.has(key)));
console.log(map instanceof WeakMap, set instanceof WeakSet, map instanceof WeakSet);
console.log(String(map.delete(key)), String(map.has(key)), String(set.delete(other)));
`,
      );
      const result = await compile(entry, {
        backend,
        sanitize: process.env["SCRIPTC_SAN"] === "1",
        outDir,
        outPath: join(outDir, "program"),
      });
      expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
      if (!result.ok) return;
      const [node, native] = await Promise.all([
        exec(process.execPath, [entry]),
        exec(result.binaryPath),
      ]);
      expect(native.stdout).toBe(node.stdout);
      expect(native.stderr).toBe(node.stderr);
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  test(`weak collections preserve native record, array, tuple and class identity (${backend})`, async () => {
    const outDir = await mkdtemp(join(tmpdir(), "scriptc-weak-boundaries-"));
    try {
      const entry = join(outDir, "main.ts");
      await writeFile(
        entry,
        `
const map = new WeakMap<object, number>();
const set = new WeakSet<object>();
const record = { value: 1 };
const array = [1, 2];
const tuple: [string, number] = ["value", 1];
class Key { value: number; constructor() { this.value = 1; } }
const instance = new Key();
function check(value: any): void {
  console.log(map.set(value, 1) === map, map.get(value), map.has(value));
  console.log(set.add(value) === set, set.has(value), map.delete(value), set.delete(value));
}
check(record);
check(array);
check(tuple);
console.log(map.set(instance, 3) === map, map.get(instance));
console.log(set.add(instance) === set, set.has(instance));
// Keep enough live keys to grow the identity table, then re-box the same
// native records after rehashing and verify their WeakMap entries survive.
const keys: { value: unknown }[] = [];
let total = 0;
for (let i = 0; i < 4096; i++) {
  const key: { value: unknown } = { value: i };
  keys.push(key);
  map.set(key, i);
}
for (const key of keys) total += map.get(key)!;
console.log(total, keys.length);
console.log("after");
`,
      );
      const result = await compile(entry, {
        backend,
        sanitize: process.env["SCRIPTC_SAN"] === "1",
        outDir,
        outPath: join(outDir, "program"),
      });
      expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
      if (!result.ok) return;
      const [reference, child] = await Promise.all([
        exec(process.execPath, [entry]),
        exec(result.binaryPath),
      ]);
      expect(child.stdout).toBe(reference.stdout);
      expect(child.stderr).toBe(reference.stderr);
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });
}
