// Records returned from functions that read arrays, called in loops so the
// result-slot entries inline: in-range reads, holes, reads past the end and
// at fractional indices (undefined fields, which make the arithmetic NaN),
// sparse arrays, boolean fields, and a recursive helper, against Node.
interface Point {
  x: number;
  y: number;
}
function pointAt(xs: number[], ys: number[], i: number): Point {
  return { x: xs[i], y: ys[i] };
}
function distance(p: Point, q: Point): number {
  const dx = p.x - q.x;
  const dy = p.y - q.y;
  return Math.sqrt(dx * dx + dy * dy);
}
function pathLength(xs: number[], ys: number[], extra: number): number {
  let total = 0;
  for (let i = 0; i + 1 + extra < xs.length + extra; i++) total += distance(pointAt(xs, ys, i), pointAt(xs, ys, i + 1));
  return total;
}
const xs: number[] = [];
const ys: number[] = [];
for (let i = 0; i < 50; i++) {
  xs.push((i * 37) % 11);
  ys.push((i * 13) % 7);
}
console.log(pathLength(xs, ys, 0).toFixed(6), pathLength(xs, ys, 1), pathLength(xs, ys, 2));
const p = pointAt(xs, ys, 60);
const q = pointAt(xs, ys, 1.5);
console.log(p.x, p.y, q.x === undefined, distance(p, pointAt(xs, ys, 0)), distance(pointAt(xs, ys, 3), pointAt(xs, ys, 3)));
const holey: number[] = [1, 2, 3];
holey.length = 6;
holey[5] = 9;
let viaHoles = "";
for (let i = 0; i < 7; i++) viaHoles += String(pointAt(holey, holey, i).x) + ",";
console.log(viaHoles);
const sparse: number[] = [4, 5];
sparse[100] = 6;
console.log(pointAt(sparse, sparse, 100).y, pointAt(sparse, sparse, 50).y, distance(pointAt(sparse, xs, 0), pointAt(sparse, xs, 1)));
interface Flags {
  on: boolean;
  next: boolean;
}
function flagsAt(bits: boolean[], i: number): Flags {
  return { on: bits[i], next: bits[i + 1] };
}
const bits = [true, false, true, true];
let flagText = "";
for (let i = 0; i < 5; i++) {
  const f = flagsAt(bits, i);
  flagText += `${f.on}/${f.next} `;
}
console.log(flagText);
interface Span {
  lo: number;
  hi: number;
}
function widen(span: Span, values: number[], from: number, to: number): Span {
  if (from >= to) return span;
  const v = values[from];
  return widen({ lo: Math.min(span.lo, v), hi: Math.max(span.hi, v) }, values, from + 1, to);
}
let spans = 0;
for (let i = 0; i + 8 <= xs.length; i += 8) {
  const s = widen({ lo: xs[i], hi: xs[i] }, xs, i + 1, i + 8);
  spans += s.hi - s.lo;
}
const past = widen({ lo: 0, hi: 0 }, xs, 48, 52);
console.log(spans, past.lo, past.hi);
