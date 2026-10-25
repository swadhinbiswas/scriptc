// Number-key Map.set and Set.add right after a get or has of the same key:
// counting, read-then-write in the next statement, writes whose value
// expression changes the collection, writes during iteration, and keys and
// values that need SameValueZero or exact bits.

function show(m: Map<number, number>): string {
  return [...m].map(([k, v]) => `${Object.is(k, -0) ? "-0" : k}=${Object.is(v, -0) ? "-0" : v}`).join(" ");
}

// Counting on sparse, dense and special keys.
const counts = new Map<number, number>();
const keys = [5, 1e9, 5, -0, 0, NaN, NaN, 2.5, 1e9, 5, -1, Infinity];
for (const k of keys) counts.set(k, (counts.get(k) ?? 0) + 1);
console.log("counts", counts.size, show(counts));

const dense = new Map<number, number>();
for (let i = 0; i < 300; i++) {
  const k = (i * 7) % 50;
  dense.set(k, (dense.get(k) ?? 0) + i);
}
let denseSum = 0;
for (const v of dense.values()) denseSum += v;
console.log("dense", dense.size, dense.get(0), dense.get(49), denseSum);

// The read in the statement before the write.
const pairs = new Map<number, number>();
for (let i = 0; i < 2000; i++) {
  const key = (i % 37) * 65536 + ((i * 11) % 13);
  const v = pairs.get(key);
  pairs.set(key, v === undefined ? 1 : v + 2);
}
let pairSum = 0;
for (const v of pairs.values()) pairSum += v;
console.log("pairs", pairs.size, pairSum, pairs.get(13 * 65536 + 4));

// has() before the write: present keys keep their position, new keys append.
const order = new Map<number, number>([
  [3, 30],
  [1, 10],
  [2, 20],
]);
for (const k of [1, 4, 3, 5, 1]) {
  if (order.has(k)) order.set(k, order.get(k)! + 1);
  else order.set(k, k * 100);
}
console.log("order", show(order));

// The write's own value expression deletes, clears or grows the map.
const churn = new Map<number, number>();
for (let i = 0; i < 8; i++) churn.set(i * 1000, i);
function dropKey(k: number): number {
  churn.delete(k);
  return 1;
}
function grow(): number {
  for (let i = 100; i < 600; i++) churn.set(i * 1000 + 1, i);
  return 2;
}
churn.set(3000, (churn.get(3000) ?? 0) + dropKey(3000));
churn.set(4000, (churn.get(4000) ?? 0) + grow());
console.log("churn", churn.size, churn.get(3000), churn.get(4000), [...churn.keys()].indexOf(3000), [...churn.keys()].indexOf(4000));
function wipe(): number {
  churn.clear();
  return 7;
}
churn.set(5000, (churn.get(5000) ?? 0) + wipe());
console.log("wiped", churn.size, churn.get(5000));

// A delete between the read and the write.
const gap = new Map<number, number>([
  [10, 1],
  [20, 2],
]);
const before = gap.get(10);
gap.delete(10);
gap.set(10, (before ?? 0) + 5);
console.log("gap", show(gap));

// Writes during iteration overwrite in place; new keys are visited.
const walk = new Map<number, number>();
for (let i = 0; i < 6; i++) walk.set(i * 3, i);
const visited: number[] = [];
for (const [k, v] of walk) {
  visited.push(k);
  walk.set(k, (walk.get(k) ?? 0) + 10);
  if (k === 6) walk.set(100, (walk.get(100) ?? 0) + v);
}
console.log("walk", visited.join(","), show(walk));

// Exact value bits and boolean values.
const bits = new Map<number, number>();
bits.set(1, 1);
const old = bits.get(1);
bits.set(1, old === undefined ? 0 : -0);
bits.set(2, (bits.get(2) ?? NaN) + 1);
console.log("bits", Object.is(bits.get(1), -0), bits.get(2), show(bits));

const flags = new Map<number, boolean>();
for (let i = 0; i < 20; i++) {
  const k = (i * 5) % 7;
  flags.set(k, !(flags.get(k) ?? false));
}
console.log("flags", [...flags].map(([k, v]) => `${k}:${v}`).join(" "));

// Sets: add after has keeps the first insertion position.
const seen = new Set<number>([7, 8, 9]);
const log: string[] = [];
for (const id of [8, 10, -0, 0, NaN, 7, NaN, 10]) {
  const present = seen.has(id);
  seen.add(id);
  log.push(present ? "y" : "n");
}
console.log("set", log.join(""), [...seen].map((k) => (Object.is(k, -0) ? "-0" : String(k))).join(","));
