// Number and boolean records that only flow into field reads keep their
// values; records that are stored, returned, captured, compared by
// identity or printed stay observable exactly like Node.
interface Point {
  x: number;
  y: number;
}
interface Flagged {
  on: boolean;
  weight: number;
}
function length2(p: Point): number {
  return p.x * p.x + p.y * p.y;
}
function dot(a: Point, b: Point): number {
  return a.x * b.x + a.y * b.y;
}
function weigh(f: Flagged): number {
  return f.on ? f.weight : -f.weight;
}
const stored: Point[] = [];
function keep(p: Point): number {
  stored.push(p);
  return p.x;
}
function same(p: Point): Point {
  return p;
}
function depth(p: Point, n: number): number {
  return n === 0 ? length2(p) : depth({ x: p.x + 1, y: p.y - 1 }, n - 1) + p.x;
}

let total = 0;
const readers: (() => number)[] = [];
for (let i = 0; i < 6; i++) {
  const p = { x: i, y: i * 2 };
  const q: Point = { x: 1, y: -1 };
  total += length2(p) + dot(p, q) + dot({ x: 3, y: 4 }, { x: i, y: 1 });
  total += weigh({ on: i % 2 === 0, weight: i });
  if (i % 3 === 0) total += keep(p);
  const r = { x: i, y: 0 };
  readers.push(() => r.x * 10);
  const s = same({ x: i, y: i });
  stored.push(s);
  const a = { x: 1, y: 2 };
  const b = { x: 1, y: 2 };
  if (a === b) total += 1000;
  total += depth({ x: i, y: 5 }, 4);
}
console.log(total);
console.log(stored.map((p) => `${p.x}:${p.y}`).join(" "));
console.log(readers.map((read) => read()).join(" "));
const shown = { x: 7, y: 8 };
console.log(shown, JSON.stringify({ x: 1, y: 2 }));
