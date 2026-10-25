// String-keyed Map/Set lookups (get of number, boolean and reference values,
// has) reject absent keys through the map's filter before probing. Hits and
// misses must stay exact across sizes (linear, bucketed, saturated filter),
// deletes (stale filter bits), clears, re-insertion, mutation during
// iteration, copies, and keys that are literals, computed, sliced, empty,
// non-ASCII, long or nearly equal.
class Item {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
}

function keyOf(i: number): string {
  return "key-" + i * 37;
}

// Maps of every size probe a fixed universe of present and absent keys.
const universe: string[] = [];
for (let i = 0; i < 300; i++) universe.push(keyOf(i));
let summary = "";
for (const size of [0, 1, 2, 3, 4, 5, 8, 15, 16, 17, 31, 64, 100, 257]) {
  const numbers = new Map<string, number>();
  const flags = new Map<string, boolean>();
  const items = new Map<string, Item>();
  const names = new Set<string>();
  for (let i = 0; i < size; i++) {
    const k = keyOf(i * 2);
    numbers.set(k, i);
    flags.set(k, i % 3 === 0);
    items.set(k, new Item("item" + i));
    names.add(k);
  }
  let hits = 0;
  let sum = 0;
  let trues = 0;
  let found = 0;
  let has = 0;
  for (const k of universe) {
    const n = numbers.get(k);
    if (n !== undefined) {
      hits++;
      sum += n;
    }
    const f = flags.get(k);
    if (f === true) trues++;
    if (items.get(k) !== undefined) found++;
    if (names.has(k)) has++;
  }
  summary += `${size}:${hits}/${sum}/${trues}/${found}/${has} `;
}
console.log(summary);

// Deleted keys leave their filter bits behind: they must still miss, and
// come back on re-insertion.
const churn = new Map<string, number>();
for (let i = 0; i < 40; i++) churn.set(keyOf(i), i);
for (let i = 0; i < 40; i += 2) churn.delete(keyOf(i));
let present = 0;
for (let i = 0; i < 40; i++) if (churn.has(keyOf(i))) present++;
console.log("after delete:", churn.size, present, churn.get(keyOf(2)), churn.get(keyOf(3)));
churn.set(keyOf(2), 99);
console.log("re-added:", churn.get(keyOf(2)), churn.has(keyOf(4)));
for (let i = 0; i < 40; i++) churn.delete(keyOf(i));
console.log("emptied:", churn.size, churn.has(keyOf(5)), churn.get(keyOf(2)));
churn.set("again", 1);
console.log("refilled:", churn.has("again"), churn.has(keyOf(1)), [...churn.keys()].join(","));

// clear(), also from inside an iteration, then refill.
const cleared = new Map<string, string>([["a", "1"], ["b", "2"], ["c", "3"]]);
const seen: string[] = [];
cleared.forEach((v, k) => {
  seen.push(k + v);
  if (k === "a") {
    cleared.clear();
    cleared.set("d", "4");
  }
});
console.log("clear in forEach:", seen.join(","), cleared.has("a"), cleared.has("d"), cleared.get("b"));

// Mutation during for-of: deleted entries are skipped, added ones visited.
const live = new Map<string, number>();
for (let i = 0; i < 10; i++) live.set("m" + i, i);
const visited: string[] = [];
for (const [k, v] of live) {
  visited.push(k);
  if (v === 2) live.delete("m5");
  if (v === 3) live.set("late", 100);
  if (k === "late") live.set("m5", 5);
}
console.log("for-of:", visited.join(","), live.has("m5"), live.get("late"));

// Key shapes: empty, non-ASCII, long, numeric-looking, nearly equal.
const shapes = new Map<string, number>();
const long = "x".repeat(100);
const shapeKeys = ["", "é", "日本語", long, long + "y", "1", "01", "abcdefgh", "abcdefgi", "abc", "ab"];
shapeKeys.forEach((k, i) => shapes.set(k, i));
const probes = ["", "e", "é", "日本", "日本語", "x".repeat(99) + "x", long + "z", "1", "1.0", "abcdefgh", "abcdefgj", "ab", "a"];
console.log("shapes:", probes.map((p) => `${JSON.stringify(p.length > 10 ? p.length : p)}=${shapes.get(p)}`).join(" "));

// Keys built at run time (uncached hashes) against literal keys.
const literal = new Map<string, number>([["alpha", 1], ["beta", 2], ["gamma", 3]]);
const parts = "al,pha,be,ta,del,ta".split(",");
const built = [parts[0] + parts[1], parts[2] + parts[3], parts[4] + parts[5], "gam" + "ma".slice(0, 2)];
console.log("built:", built.map((k) => `${k}=${literal.get(k)}/${literal.has(k)}`).join(" "));
const sliced = "xxalphaxxbetaxx";
console.log("sliced:", literal.get(sliced.slice(2, 7)), literal.has(sliced.slice(9, 13)), literal.has(sliced.slice(9, 12)));

// Copies keep their membership; Set built from an array.
const copy = new Map(literal);
copy.delete("beta");
const fromArray = new Set(["p", "q", "r", "q"]);
console.log("copy:", copy.has("alpha"), copy.has("beta"), literal.has("beta"), fromArray.size, fromArray.has("q"), fromArray.has("s"));

// A large map saturates the filter; lookups still decide by key.
const big = new Map<string, number>();
for (let i = 0; i < 5000; i++) big.set("big" + i, i);
let bigHits = 0;
let bigSum = 0;
for (let i = 0; i < 10000; i += 3) {
  const v = big.get("big" + i);
  if (v !== undefined) {
    bigHits++;
    bigSum += v;
  }
}
for (let i = 0; i < 5000; i += 2) big.delete("big" + i);
let bigLeft = 0;
for (let i = 0; i < 5000; i++) if (big.has("big" + i)) bigLeft++;
console.log("big:", bigHits, bigSum, big.size, bigLeft);
