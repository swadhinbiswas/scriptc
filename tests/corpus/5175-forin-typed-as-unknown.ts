// for-in over typed records seen as unknown or any: key order, optional
// fields, loop control and every binding form.
const keysIn = (o: unknown): string => {
  const out: string[] = [];
  for (const k in o as Record<string, unknown>) out.push(k);
  return out.join(",");
};
type Row = { id: number; name: string; tags: string[]; nested: { a: number; b: number } };
const row: Row = { id: 1, name: "r", tags: ["x"], nested: { a: 1, b: 2 } };
console.log("row", keysIn(row), keysIn(row.nested), keysIn(row.tags));
type Opt = { zeta: number; alpha?: string; mid: boolean; extra?: number[] };
const opts: Opt[] = [
  { zeta: 1, mid: true },
  { zeta: 2, alpha: "a", mid: false },
  { zeta: 3, mid: true, extra: [1] },
  { zeta: 4, alpha: undefined, mid: false },
];
for (const o of opts) console.log("opt", keysIn(o));
const numeric = { b: 1, "2": 2, a: 3, "1": 4, "10": 5, "-1": 6, "01": 7 };
console.log("numeric", keysIn(numeric));

// The same shape walked many times, and two shapes interleaved.
let total = 0;
const other = { p: 1, q: 2, r: 3 };
for (let i = 0; i < 1000; i++) total += keysIn(i % 2 ? row : other).length;
console.log("repeat", total, keysIn(row), keysIn(other));

// break, continue, labels, nested loops.
function walk(o: unknown): string {
  const out: string[] = [];
  outer: for (const k in o as Record<string, unknown>) {
    if (k === "name") continue;
    for (const j in o as Record<string, unknown>) {
      if (j === k) continue outer;
      if (j === "tags") break;
      out.push(k + ":" + j);
    }
    if (k === "nested") break;
  }
  return out.join(" ");
}
console.log("control", walk(row));

// Binding forms: var, a pre-declared let, and reading values by key.
function forms(o: unknown): string {
  const rec = o as Record<string, unknown>;
  let last = "";
  for (last in rec) {
    // assigns the outer binding
  }
  const out: string[] = [];
  for (var k in rec) out.push(k + "=" + JSON.stringify(rec[k]));
  return last + "|" + out.join(";");
}
console.log("forms", forms(row));

// any receivers.
const loose: any = row;
const anyKeys: string[] = [];
for (const k in loose) anyKeys.push(k);
console.log("any", anyKeys.join(","));
