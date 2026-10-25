// Map get followed by set on the same key reuses the read's entry when
// nothing in between can touch a collection. Present and absent keys, NaN
// and signed zeros, aliases, other maps and keys, and intervening mutations
// must keep Node's values and insertion order.

function show(label: string, m: Map<string, number>): void {
  const parts: string[] = [];
  for (const [k, v] of m) parts.push(k + "=" + v);
  console.log(label, m.size, parts.join(" "));
}

function showNumbers(label: string, m: Map<number, number>): void {
  const parts: string[] = [];
  for (const [k, v] of m) parts.push((Object.is(k, -0) ? "-0" : String(k)) + "=" + v);
  console.log(label, m.size, parts.join(" "));
}

// Counting: the first occurrence inserts, later ones overwrite in place.
const words = "the cat and the hat and the bat".split(" ");
const counts: Map<string, number> = new Map();
for (const w of words) {
  const cur = counts.get(w);
  counts.set(w, (cur === undefined ? 0 : cur) + 1);
}
show("counts", counts);

// The single-statement form.
const lengths: Map<string, number> = new Map();
for (const w of words) lengths.set(w, (lengths.get(w) ?? 0) + w.length);
show("lengths", lengths);

// Number keys: NaN finds NaN, -0 and +0 are one key (SameValueZero).
const nums: Map<number, number> = new Map();
const keys = [1, NaN, -0, 0, 2, NaN, 0, -0, 1, Number.NaN];
for (const k of keys) {
  const prev = nums.get(k);
  nums.set(k, prev === undefined ? 100 : prev + 1);
}
showNumbers("nums", nums);
console.log("has -0", nums.has(-0), "get 0", nums.get(0), "get NaN", nums.get(NaN));

// A NaN value is stored and read back.
const nanValues: Map<string, number> = new Map();
nanValues.set("x", 1);
const x0 = nanValues.get("x");
nanValues.set("x", (x0 ?? 0) * NaN);
console.log("nan value", nanValues.get("x"));

// An alias of the same map, and a write to a different map or key.
const a: Map<string, number> = new Map([
  ["p", 1],
  ["q", 2],
]);
const alias = a;
const other: Map<string, number> = new Map([["p", 50]]);
const p1 = a.get("p");
alias.set("p", (p1 ?? 0) + 10);
const p2 = a.get("p");
other.set("p", (p2 ?? 0) + 1);
const q1 = a.get("q");
a.set("r", (q1 ?? 0) + 3);
show("a", a);
show("other", other);

// The map changes between the read and the write: delete re-appends,
// clear empties, a fresh insert grows the table.
const m: Map<string, number> = new Map([
  ["k1", 1],
  ["k2", 2],
  ["k3", 3],
]);
const v1 = m.get("k1");
m.delete("k1");
m.set("k1", (v1 ?? 0) + 1);
show("deleted", m);
const v2 = m.get("k2");
m.set("k2", (v2 ?? 0) + (m.delete("k3") ? 100 : 0));
show("delete inside", m);
const v3 = m.get("k2");
m.clear();
m.set("k2", (v3 ?? 0) + 1);
show("cleared", m);
for (let i = 0; i < 40; i++) {
  const key = "g" + (i % 17);
  const before = m.get(key);
  m.set(key, (before ?? 0) + i);
}
show("grown", m);

// Keys built fresh for the write still update the same entry.
const fresh: Map<string, number> = new Map();
for (let i = 0; i < 6; i++) {
  const got = fresh.get("id" + (i % 2));
  fresh.set("id" + (i % 2), (got ?? 0) + i);
}
show("fresh", fresh);

// Boolean values toggle in place.
const flags: Map<number, boolean> = new Map();
for (let i = 0; i < 7; i++) {
  const k = i % 3;
  const f = flags.get(k);
  flags.set(k, f === undefined ? true : !f);
}
console.log("flags", [...flags.entries()].map(([k, v]) => k + ":" + v).join(" "));

// Inside a function, behind a condition, and with a throwing key read.
type Row = { cat: string; v: number };
function aggregate(rows: Row[]): Map<string, number> {
  const agg: Map<string, number> = new Map();
  for (const r of rows) {
    if (r.v < 0) continue;
    const cur = agg.get(r.cat);
    agg.set(r.cat, (cur === undefined ? 0 : cur) + r.v);
  }
  return agg;
}
const rows: Row[] = [
  { cat: "b", v: 2 },
  { cat: "a", v: 1 },
  { cat: "b", v: -5 },
  { cat: "c", v: 4 },
  { cat: "a", v: 8 },
];
show("aggregate", aggregate(rows));
try {
  const maybe: (Row | undefined)[] = [rows[0], undefined];
  const agg: Map<string, number> = new Map();
  for (const r of maybe) {
    const cur = agg.get((r as Row).cat);
    agg.set((r as Row).cat, (cur ?? 0) + 1);
  }
} catch (e) {
  console.log("threw", e instanceof TypeError);
}
