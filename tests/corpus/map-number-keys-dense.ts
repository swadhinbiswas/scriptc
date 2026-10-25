// Number-keyed Maps and Sets whose keys are small non-negative integers are
// indexed directly; any other key (negative, fractional, NaN, huge) moves the
// collection to hashing. Lookups, SameValueZero, insertion order, deletion,
// re-insertion, iteration under mutation and clones must behave identically
// before, during and after that transition.

class Box {
  label: string;
  constructor(label: string) {
    this.label = label;
  }
}

function keysOf(m: Map<number, string>): string {
  return [...m.keys()].map((k) => (Object.is(k, -0) ? "-0" : String(k))).join(",");
}

function probe(m: Map<number, string>, label: string): void {
  const keys = [0, -0, 1, 2, 3, 7, 15, 16, 17, 31, 64, 100, -1, 1.5, 2.0000001, NaN, Infinity, -Infinity, 4294967295, 4294967296, 1e20];
  const seen: string[] = [];
  for (const k of keys) seen.push(`${Object.is(k, -0) ? "-0" : k}:${m.has(k) ? m.get(k) : "-"}`);
  console.log(label, m.size, seen.join(" "));
}

// Sequential ids: the direct-index shape.
const ids = new Map<number, string>();
for (let i = 1; i <= 40; i++) ids.set(i, "v" + i);
probe(ids, "sequential");
ids.set(-0, "zero");
console.log("minus zero stored as", keysOf(ids).split(",")[40], ids.get(0), ids.get(-0));
ids.set(3, "three"); // overwrite keeps the position
ids.delete(2);
ids.set(2, "two again"); // re-insertion appends
console.log(keysOf(ids));
probe(ids, "after edits");

// Out-of-order inserts keep insertion order, not key order.
const shuffled = new Map<number, string>();
for (const k of [50, 3, 7, 0, 12, 9, 33, 1, 2, 63, 4]) shuffled.set(k, "s" + k);
console.log(keysOf(shuffled), shuffled.get(63), shuffled.get(5));

// Each non-dense key shape converts a dense map to hashing; existing entries,
// order and lookups survive the conversion.
for (const odd of [-1, 1.5, NaN, 1e9, Infinity, 4294967296, -0.5]) {
  const m = new Map<number, string>();
  for (let i = 0; i < 20; i++) m.set(i * 2, "e" + i);
  m.delete(4);
  m.set(odd, "odd");
  m.set(4, "four");
  m.set(41, "after");
  console.log(String(odd), keysOf(m), m.get(odd), m.has(odd), m.get(4), m.get(38), m.get(5), m.size);
}

// Sparse from the start: few entries spread over a wide range hash at once.
const sparse = new Map<number, string>();
for (const k of [0, 1000000, 5, 999999, 77, 123456789]) sparse.set(k, "p" + k);
console.log(keysOf(sparse), sparse.get(999999), sparse.get(6));

// Growth well past the initial table, then deletes heavy enough to compact.
const big = new Map<number, number>();
for (let i = 0; i < 5000; i++) big.set(i, i * i);
let sum = 0;
for (let i = 0; i < 5000; i += 3) sum += big.get(i) ?? -1;
for (let i = 0; i < 5000; i++) if (i % 4 !== 0) big.delete(i);
for (let i = 5000; i < 5010; i++) big.set(i, -i);
console.log(big.size, sum, big.get(4), big.get(5), big.get(4996), big.get(5009), [...big.keys()].slice(0, 5).join(","), [...big.keys()].slice(-3).join(","));

// clear() then reuse, including keys of a different shape.
big.clear();
console.log(big.size, big.get(0), big.has(8));
for (let i = 10; i < 20; i++) big.set(i, i);
big.set(0.25, 1);
console.log([...big.entries()].map(([k, v]) => `${k}=${v}`).join(" "));

// Mutation during forEach: deleted entries are skipped, new ones visited.
const live = new Map<number, string>();
for (let i = 0; i < 10; i++) live.set(i, "l" + i);
const visited: number[] = [];
live.forEach((_v, k) => {
  visited.push(k);
  if (k === 2) live.delete(5);
  if (k === 3) live.set(10, "l10");
  if (k === 4) live.set(1, "l1 replaced");
  if (k === 6) live.set(-3, "negative");
});
console.log(visited.join(","), live.get(1), live.size, keysOf(live));

// for..of with deletion and re-insertion of the current key.
const cycle = new Map<number, string>();
for (let i = 0; i < 8; i++) cycle.set(i, "c" + i);
const order: number[] = [];
for (const [k] of cycle) {
  order.push(k);
  if (k < 3) {
    cycle.delete(k);
    cycle.set(k, "again");
  }
  if (order.length > 20) break;
}
console.log(order.join(","), keysOf(cycle));

// A small map that grows its index during iteration (integer keys move to
// the direct index, fractional ones to buckets) keeps visiting in order;
// churn on a small map and clear() mid-walk keep the iterator's position.
for (const offset of [0, 0.5]) {
  const small = new Map<number, string>();
  for (let i = 0; i < 4; i++) small.set(i + offset, "v" + i);
  for (let i = 0; i < 50; i++) {
    small.delete(3 + offset);
    small.set(3 + offset, "churn" + i);
  }
  const walk: string[] = [];
  let grown = false;
  let cleared = false;
  for (const [k, v] of small) {
    walk.push(`${k}=${v}`);
    if (!grown) {
      grown = true;
      small.delete(1 + offset);
      for (let i = 4; i < 12; i++) small.set(i + offset, "g" + i);
    }
    if (!cleared && k === 6 + offset) {
      cleared = true;
      small.clear();
      small.set(100 + offset, "after");
      small.set(offset, "again");
    }
    if (walk.length > 40) break;
  }
  console.log(walk.join(" "), small.size, keysOf(small));
}

// Reference values: reads return the stored object; a removed entry's value
// stays alive while a read holds it.
const boxes = new Map<number, Box>();
for (let i = 0; i < 12; i++) boxes.set(i, new Box("b" + i));
const held = boxes.get(7);
boxes.delete(7);
boxes.set(7, new Box("replacement"));
console.log(held?.label, boxes.get(7)?.label, boxes.get(7) === held, boxes.get(3) === boxes.get(3), boxes.get(12)?.label);
let links = boxes.get(20);
if (links === undefined) {
  links = new Box("created");
  boxes.set(20, links);
}
console.log(links.label, boxes.get(20) === links, boxes.size);

// Boolean and optional values.
const flags = new Map<number, boolean>();
for (let i = 0; i < 10; i++) flags.set(i, i % 3 === 0);
console.log(flags.get(3), flags.get(4), flags.get(10), flags.has(9));
const maybe = new Map<number, string | undefined>();
for (let i = 0; i < 10; i++) maybe.set(i, i % 2 === 0 ? undefined : "m" + i);
console.log(maybe.get(2), maybe.has(2), maybe.get(3), maybe.get(11), maybe.has(11));

// Sets share the representation.
const set = new Set<number>();
for (let i = 0; i < 30; i++) set.add(i % 17);
console.log(set.size, set.has(16), set.has(17), set.has(-0), set.has(0.5));
set.add(-0);
set.add(NaN);
console.log(set.size, set.has(NaN), [...set].slice(-3).map((v) => String(v)).join(","));
const seeded = new Set<number>([5, 1, 5, 9, 1, 0, 2, 3, 4, 8]);
console.log([...seeded].join(","), seeded.has(9), seeded.has(6));
seeded.delete(9);
seeded.add(9);
console.log([...seeded].join(","));

// Copies are independent and keep order.
const original = new Map<number, string>();
for (let i = 0; i < 9; i++) original.set(8 - i, "o" + i);
original.delete(3);
const copy = new Map(original);
copy.set(100, "c");
copy.set(3, "back");
original.set(4, "changed");
console.log(keysOf(original), original.get(4));
console.log(keysOf(copy), copy.get(4), copy.get(100));
const setCopy = new Set(seeded);
setCopy.add(-7);
console.log([...setCopy].join(","), seeded.has(-7));
