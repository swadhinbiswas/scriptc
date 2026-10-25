// for-in over typed values crossing an unknown boundary: records in
// arrays and maps, generic helpers, and records with every field optional.
type Partial3 = { a?: number; b?: string; c?: boolean };
const partials: Partial3[] = [{}, { a: 1 }, { b: "x", c: true }, { a: 1, b: "y", c: false }];
function keyList(o: unknown): string {
  const out: string[] = [];
  for (const k in o as Record<string, unknown>) out.push(k);
  return "[" + out.join(",") + "]";
}
console.log(partials.map(keyList).join(" "));

function describe<T extends object>(value: T): string {
  return keyList(value) + Object.keys(value as unknown as object).length;
}
console.log(describe({ one: 1 }), describe({ two: 2, three: [3] }));

const byName = new Map<string, { id: number; tag: string }>([
  ["a", { id: 1, tag: "t" }],
  ["b", { id: 2, tag: "u" }],
]);
for (const [name, v] of byName) console.log(name, keyList(v));

// Writes through the unknown view are visible to later walks.
const live: { x: number; y?: number } = { x: 1 };
const view = live as unknown as Record<string, unknown>;
console.log(keyList(view));
live.y = 2;
console.log(keyList(view), Object.keys(view).join(","));

let sum = 0;
const shapes = [{ k1: 1 }, { k1: 1, k2: 2 }, { k3: 3 }];
for (let i = 0; i < 3000; i++) for (const k in shapes[i % 3] as Record<string, unknown>) sum += k.length;
console.log("sum", sum);
