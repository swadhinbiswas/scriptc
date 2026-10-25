import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import { compile } from "../src/index.js";

test("checked class arrays reject unbranded and differently branded elements", async () => {
  const dir = mkdtempSync("/tmp/scriptc-class-arrays-");
  try {
    const entry = join(dir, "main.ts");
    writeFileSync(
      entry,
      `
class Item { value = 1; }
class Child extends Item { extra = 2; }
class Sibling extends Item { extra = 3; }
class Other { value = 1; }
function check(input: unknown): void {
  try { const items = input as Item[]; console.log('accepted', items.length); }
  catch (error) { console.log('rejected', error instanceof TypeError); }
}
check([new Item()]);
check([new Child()]);
check([new Other()]);
check([{value: 1}]);
const mixed: unknown[] = [];
mixed.push(new Item()); mixed.push({value: 1});
check(mixed);
check(null);
check([1]);
check([]);
function checkChild(input: unknown): void {
  try { const child = input as Child; console.log('child', child.extra); }
  catch (error) { console.log('wrong child', error instanceof TypeError); }
}
checkChild(new Child());
checkChild(new Item());
checkChild(new Sibling());
checkChild({ value: 1, extra: 2 });
`,
    );
    const result = await compile(entry, {
      outDir: dir,
      outPath: join(dir, "program"),
      sanitize: process.env["SCRIPTC_SAN"] === "1",
    });
    if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
    const child = spawnSync(result.binaryPath, [], { encoding: "utf8", timeout: 30_000 });
    expect(child.error).toBeUndefined();
    expect({
      status: child.status,
      signal: child.signal,
      stdout: child.stdout,
      stderr: child.stderr,
    }).toEqual({
      status: 0,
      signal: null,
      stderr: "",
      stdout:
        "accepted 1\naccepted 1\nrejected true\nrejected true\nrejected true\nrejected true\nrejected true\naccepted 0\nchild 2\nwrong child true\nwrong child true\nwrong child true\n",
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
