// Scalar optional values that escape into arrays, fields, maps, closures
// and stored parameters keep their own heap values.
const kept: (number | undefined)[] = [];
function keep(x: number | undefined): void { kept.push(x); }
function keepTwice(x: number | undefined): number | undefined { kept.push(x); return x; }
class Holder { v: number | undefined = undefined; set(x: number | undefined) { this.v = x; } }
const h = new Holder();
const m = new Map<string, number | undefined>();
const fns: (() => number | undefined)[] = [];
function at(xs: number[], i: number): number | undefined { return xs[i]; }
const xs = [10, 20];
for (let i = 0; i < 4; i++) {
  let a: number | undefined = xs[i];
  let b: number | undefined = xs[i + 1];
  if (i === 2) { a = 5; b = undefined; }
  const pick = i % 2 === 0 ? a : b;
  keep(i % 2 === 0 ? a : b);
  keep(xs[i] ?? xs[0]);
  keep(at(xs, i));
  keepTwice(pick);
  h.set(i > 1 ? at(xs, i) : xs[i]);
  m.set("k" + i, at(xs, i) ?? at(xs, 0));
  const captured = at(xs, i);
  fns.push(() => captured);
  console.log(pick, h.v, m.get("k" + i));
}
console.log(kept, fns.map((f) => f()));
function deep(n: number): number | undefined { return n === 0 ? undefined : (deep(n - 1) ?? n); }
try { console.log(deep(1e7)); } catch (e) { console.log("caught", (e as Error).name); }
console.log(deep(100));
