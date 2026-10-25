// Number-keyed Map and Set lookups on hashed storage: small maps that
// scan their entries, bucket tables, keys that need SameValueZero
// normalization, deletes and clears between reads, and maps that move
// between the direct index and hashing.

const special = [0, -0, NaN, Infinity, -Infinity, 0.5, -1, 2 ** 53, 1e300, Number.MIN_VALUE, Number.MAX_VALUE];

function describe(m: Map<number, string>, keys: number[]): string {
  return keys.map((k) => `${Object.is(k, -0) ? "-0" : k}:${m.has(k) ? m.get(k) : "-"}`).join(" ");
}

// Small maps keep no bucket table.
const small = new Map<number, string>();
small.set(1e300, "big");
small.set(-0, "zero");
small.set(NaN, "nan");
console.log("small", small.size, describe(small, special));
console.log("small keys", [...small.keys()].map((k) => (Object.is(k, -0) ? "-0" : String(k))).join(","));
small.delete(0);
console.log("small after delete", small.size, describe(small, special));
small.set(0, "again");
console.log("small re-add", describe(small, [0, -0, NaN, 1e300]));

// Bucket tables of sparse ids, with hits, misses and tombstones.
const table = new Map<number, number>();
for (let i = 0; i < 3000; i++) table.set(100000 + i * 7919, i);
let hits = 0,
  misses = 0,
  sum = 0;
for (let i = 0; i < 6000; i++) {
  const k = 100000 + i * 7919;
  const v = table.get(k);
  if (v === undefined) misses++;
  else {
    hits++;
    sum += v;
  }
  if (table.has(k + 1)) hits += 1000000;
}
console.log("table", table.size, hits, misses, sum);
for (let i = 0; i < 3000; i += 3) table.delete(100000 + i * 7919);
let live = 0;
for (let i = 0; i < 3000; i++) if (table.has(100000 + i * 7919)) live++;
console.log("table after deletes", table.size, live, table.get(100000), table.get(100000 + 7919));
for (const k of special) table.set(k, -1);
console.log("table specials", table.size, special.map((k) => table.get(k)).join(","), table.get(0.25));
table.clear();
console.log("table cleared", table.size, table.get(100000 + 7919), table.has(NaN));

// A read, a write of the same key, then the read again.
const m = new Map<number, number>();
for (let i = 0; i < 64; i++) m.set(i * 1000003, i);
const key = 5 * 1000003;
const before = m.get(key);
m.delete(key);
const afterDelete = m.get(key);
const hadIt = m.has(key);
m.set(key, 99);
const afterSet = m.get(key);
for (let i = 64; i < 400; i++) m.set(i * 1000003, i); // grows the bucket table
const afterGrowth = m.get(key);
console.log("reread", before, afterDelete, hadIt, afterSet, afterGrowth, m.size);

// Direct index to hashing and back.
const ids = new Map<number, string>();
for (let i = 0; i < 40; i++) ids.set(i, `id${i}`);
console.log("dense", ids.get(0), ids.get(39), ids.get(40), ids.has(-1), ids.get(-0));
ids.set(-5, "neg");
ids.set(1.5, "half");
console.log("hashed", ids.size, ids.get(0), ids.get(39), ids.get(-5), ids.get(1.5), ids.get(2.5));
ids.delete(-5);
ids.delete(1.5);
for (let i = 40; i < 200; i++) ids.set(i, `id${i}`);
console.log("regrown", ids.size, ids.get(0), ids.get(150), ids.get(-5), ids.get(1.5));

// Sets and boolean and reference values.
const seen = new Set<number>();
for (let i = 0; i < 500; i++) seen.add((i * 2654435761) % 4294967296);
let found = 0;
for (let i = 0; i < 1000; i++) if (seen.has((i * 2654435761) % 4294967296)) found++;
console.log("set", seen.size, found, seen.has(NaN), seen.has(-0));
seen.add(-0);
seen.add(NaN);
console.log("set specials", seen.has(0), seen.has(NaN), seen.size);

const flags = new Map<number, boolean>();
for (let i = 0; i < 100; i++) flags.set(i * 37 + 1e6, i % 3 === 0);
let truthy = 0;
for (let i = 0; i < 100; i++) if (flags.get(i * 37 + 1e6)) truthy++;
console.log("flags", truthy, flags.get(1e6), flags.get(1e6 + 37), flags.get(5));

interface Node {
  id: number;
  label: string;
}
const nodes = new Map<number, Node>();
for (let i = 0; i < 300; i++) nodes.set(50000 + i * 13, { id: i, label: `n${i}` });
let labels = "";
for (let i = 0; i < 300; i += 37) {
  const node = nodes.get(50000 + i * 13);
  labels += node === undefined ? "?" : node.label;
  if (nodes.has(50000 + i * 13 + 1)) labels += "!";
}
console.log("nodes", nodes.size, labels, nodes.get(49999)?.label ?? "none");
