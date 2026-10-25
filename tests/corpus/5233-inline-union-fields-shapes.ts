// Inline scalar-union fields across shape boundaries: discriminated unions
// sharing a field, keyed reads and writes, width conversions, throwing
// field initializers and records that never leave their frame.
type Shape =
  | { kind: "circle"; r: number | undefined; tag?: number }
  | { kind: "square"; side: number; tag?: number }
  | { kind: "label"; text: string; tag?: number };

function area(s: Shape): number {
  switch (s.kind) {
    case "circle":
      return Math.PI * (s.r ?? 1) ** 2;
    case "square":
      return s.side * s.side;
    default:
      return s.text.length;
  }
}
const shapes: Shape[] = [
  { kind: "circle", r: 2, tag: 1 },
  { kind: "circle", r: undefined },
  { kind: "square", side: 3, tag: undefined },
  { kind: "label", text: "hello", tag: 7 },
];
for (const s of shapes) console.log(s.kind, area(s).toFixed(3), s.tag);
console.log(shapes.map((s) => s.tag ?? -1).join(","));

interface Scores {
  best?: number;
  [name: string]: number | undefined;
}
const scores: Scores = { best: 3 };
scores["alice"] = 10;
scores["best"] = undefined;
scores.best = (scores["alice"] ?? 0) + 1;
const names = ["alice", "best", "bob"];
for (const n of names) console.log(n, scores[n], n in scores);
console.log(JSON.stringify(scores), Object.keys(scores));

interface Wide {
  a: number;
  b?: number;
  c?: boolean;
}
interface Narrow {
  a: number;
  b?: number;
}
function narrow(w: Wide): Narrow {
  return { a: w.a, b: w.b };
}
const wides: Wide[] = [{ a: 1 }, { a: 2, b: 3 }, { a: 4, b: undefined, c: true }];
console.log(wides.map(narrow), wides.map((w) => ({ ...w, a: w.a * 10 })));

function boom(n: number): number | undefined {
  if (n > 2) throw new RangeError(`too big: ${n}`);
  return n === 1 ? undefined : n;
}
for (let i = 0; i < 4; i++) {
  try {
    const rec = { first: boom(i), second: boom(i - 1) };
    console.log("built", rec);
  } catch (e) {
    console.log("caught", (e as Error).message);
  }
}

// Records that stay in their frame.
interface Pair {
  lo: number | undefined;
  hi: number | undefined;
}
function span(values: number[], from: number): Pair {
  return { lo: values[from], hi: values[from + 3] };
}
function width(p: Pair): number {
  return p.lo === undefined || p.hi === undefined ? -1 : p.hi - p.lo;
}
const data = [3, 1, 4, 1, 5, 9, 2, 6];
let acc = 0;
for (let r = 0; r < 3; r++) {
  for (let i = 0; i < data.length; i++) {
    const p = span(data, i);
    acc += width(p);
    let q: Pair = { lo: p.hi, hi: p.lo };
    if (q.lo !== undefined) q = { lo: q.lo + 1, hi: q.hi };
    acc += (q.lo ?? 0) - (q.hi ?? 0);
  }
}
console.log("acc", acc);
