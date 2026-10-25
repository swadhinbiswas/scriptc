// deepStrictEqual and notDeepStrictEqual over statically typed values
// report Node's diff and inspected values in their messages.
import assert from "node:assert";

function message(run: () => void): string {
  try {
    run();
    return "pass";
  } catch (e) {
    return e instanceof Error ? JSON.stringify(e.message) : "not an error";
  }
}

interface Item { id: number; tags: string[]; meta?: { owner: string } }
const a: Item = { id: 1, tags: ["x", "y"] };
const b: Item = { id: 1, tags: ["x", "z"] };
const c: Item = { id: 1, tags: ["x", "y"], meta: { owner: "me" } };

console.log(message(() => assert.deepStrictEqual(a, b)));
console.log(message(() => assert.deepStrictEqual(a, c)));
const same: Item = { id: 1, tags: ["x", "y"] };
console.log(message(() => assert.notDeepStrictEqual(a, same)));
console.log(message(() => assert.deepStrictEqual([1, 2, 3], [1, 2, 4])));
console.log(message(() => assert.deepStrictEqual([0], [-0])));
console.log(message(() => assert.deepStrictEqual(new Map([["k", [1]]]), new Map([["k", [2]]]))));
console.log(message(() => assert.deepStrictEqual(new Set(["a"]), new Set(["b"]))));
console.log(message(() => assert.deepStrictEqual(new Uint8Array([1, 2]), new Uint8Array([1, 3]))));
console.log(message(() => assert.deepStrictEqual(Buffer.from("ab"), Buffer.from("ac"))));
console.log(message(() => assert.deepStrictEqual(a, b, "items differ")));
console.log(message(() => assert.notDeepStrictEqual(a, a, "same item")));
const long: number[] = [];
for (let i = 0; i < 40; i++) long.push(i);
const longer = long.slice();
longer[20] = -1;
console.log(message(() => assert.deepStrictEqual(long, longer)));
