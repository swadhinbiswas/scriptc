// Map and Set clear(), reuse and iteration after clear and after mass
// deletion, for number, string and object keys. The sizes cross the
// runtime's storage thresholds: maps grow far beyond their later size, so
// clear() and delete release or shrink their index tables, number keys move
// between the direct index and hashing, and every later operation must
// still follow insertion order exactly.

class Point {
  readonly x: number;
  readonly y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

function summarize<K>(label: string, all: K[], show: (k: K) => string): void {
  const head = all.slice(0, 4).map(show).join(",");
  const tail = all.slice(-3).map(show).join(",");
  console.log(`${label}: size=${all.length} head=[${head}] tail=[${tail}]`);
}

// ── number keys: dense table grown large, then cleared and reused ──────────
const nums = new Map<number, number>();
for (let i = 0; i < 70000; i++) nums.set(i, i * 2);
console.log("nums grown", nums.size, nums.get(69999), nums.has(70000));
nums.clear();
console.log("nums cleared", nums.size, nums.has(0), nums.get(5), [...nums.keys()].length);
nums.clear(); // empty clear
nums.clear();
for (const k of [5, 3, 9, 3, 1000000, 0.5, -0, 7]) nums.set(k, k + 1);
summarize("nums reuse", [...nums.keys()], (k) => String(Object.is(k, -0) ? "-0" : k));
console.log("nums -0 stored as", Object.is([...nums.keys()][5], -0) ? "-0" : "+0");
console.log("nums values", [...nums.values()].join(","));
// many small fill/clear rounds after the large one
let roundSum = 0;
for (let round = 0; round < 2000; round++) {
  nums.clear();
  for (let j = 0; j < round % 9; j++) nums.set(round * 10 + j, j);
  for (const [k, v] of nums) roundSum += k * 3 + v;
  roundSum += nums.size;
}
console.log("nums rounds", roundSum, nums.size);

// ── number keys: mass deletion, then iteration and lookups ────────────────
const ids = new Set<number>();
for (let i = 0; i < 50000; i++) ids.add(i);
for (let i = 0; i < 49990; i++) ids.delete(i); // survivors are far from zero
summarize("ids after deletes", [...ids], (k) => String(k));
console.log("ids lookups", ids.has(49989), ids.has(49990), ids.has(49999), ids.has(0));
ids.add(3);
ids.add(49989);
summarize("ids re-added", [...ids], (k) => String(k));
for (let i = 49999; i >= 20; i--) ids.delete(i); // now small keys only
summarize("ids small", [...ids], (k) => String(k));
for (let i = 0; i < 100; i++) ids.add(i);
summarize("ids regrown", [...ids], (k) => String(k));

// ── stack-like add/delete like a recursion guard, cleared on every reset ──
const guard = new Set<number>();
let maybe = 0;
function visit(depth: number, id: number): void {
  if (guard.has(id)) {
    maybe++;
    return;
  }
  guard.add(id);
  if (depth > 0) {
    visit(depth - 1, id * 3 + 1);
    visit(depth - 1, (id * 7) % 1000);
  }
  guard.delete(id);
}
for (let check = 0; check < 300; check++) {
  guard.clear();
  visit(check % 50 === 0 ? 12 : 3, check * 100003);
}
console.log("guard", maybe, guard.size, [...guard].length);

// ── string keys ──────────────────────────────────────────────────────────
const words = new Map<string, number>();
for (let i = 0; i < 20000; i++) words.set(`w${i}`, i);
words.clear();
console.log("words cleared", words.size, words.has("w1"), words.get("w2"));
for (const w of ["delta", "alpha", "charlie", "alpha", "bravo"]) words.set(w, (words.get(w) ?? 0) + 1);
summarize("words reuse", [...words.entries()], ([k, v]) => `${k}=${v}`);
for (let i = 0; i < 5000; i++) words.set(`x${i}`, i);
for (let i = 0; i < 4990; i++) words.delete(`x${i}`);
summarize("words after deletes", [...words.keys()], (k) => k);
const tags = new Set<string>(["a", "b", "c"]);
tags.clear();
tags.add("z");
tags.add("a");
console.log("tags", [...tags].join(","), tags.has("b"));

// ── object keys ──────────────────────────────────────────────────────────
const points: Point[] = [];
for (let i = 0; i < 3000; i++) points.push(new Point(i, -i));
const owners = new Map<Point, string>();
for (const p of points) owners.set(p, `p${p.x}`);
owners.clear();
console.log("owners cleared", owners.size, owners.has(points[0]!));
owners.set(points[10]!, "ten");
owners.set(points[2]!, "two");
owners.set(points[10]!, "TEN");
summarize("owners reuse", [...owners.entries()], ([p, s]) => `${p.x}:${s}`);
const seen = new Set<Point>(points);
for (let i = 0; i < 2995; i++) seen.delete(points[i]!);
summarize("seen after deletes", [...seen], (p) => `${p.x}/${p.y}`);

// ── clear and delete during iteration (Node's live iteration) ────────────
const live = new Map<number, string>();
for (let i = 0; i < 400; i++) live.set(i, `v${i}`);
const visited: number[] = [];
for (const [k] of live) {
  visited.push(k);
  if (k === 2) {
    live.clear();
    live.set(1000, "after");
    live.set(1001, "after");
  }
  if (k === 1000) live.set(1002, "late");
}
console.log("live visited", visited.join(","), "size", live.size);

const churn = new Set<number>();
for (let i = 0; i < 300; i++) churn.add(i);
let walked = 0;
churn.forEach((k) => {
  walked++;
  churn.delete(k);
  if (k < 100) churn.add(k + 1000);
});
summarize("churn after forEach", [...churn], (k) => String(k));
console.log("churn walked", walked);

const strs = new Map<string, number>();
for (let i = 0; i < 500; i++) strs.set(`s${i}`, i);
const order: string[] = [];
strs.forEach((_v, k) => {
  order.push(k);
  if (k === "s1") {
    strs.clear();
    strs.set("fresh", 1);
  }
});
console.log("strs visited", order.join(","), [...strs.keys()].join(","));
