// Loop bindings of number records and objects that the body reassigns:
// for...of over arrays, holey arrays, Sets, Map values and generators,
// destructured bindings, for-loop headers and for...in bodies all read
// the value most recently assigned, and the iterated values are unchanged.
interface P { x: number; y: number }
class C { v: number; constructor(v: number) { this.v = v; } }
function shift(p: P): P { return { x: p.x + 100, y: p.y }; }
function read(p: P): number { return p.x * 10 + p.y; }
const points: P[] = [{ x: 1, y: 2 }, { x: 3, y: 4 }];
const objects = [new C(1), new C(2)];
let out = "";
for (let p of points) {
  out += read(p) + " ";
  p = { x: p.x + 10, y: 0 };
  out += read(p) + " ";
  p = shift(p);
  out += read(p) + ";";
}
for (let c of objects) {
  c = new C(c.v * 7);
  out += c.v + ";";
}
for (let { x, y } of points) {
  let q: P = { x, y };
  q = shift(q);
  out += read(q) + ";";
}
for (let i = 0, p: P = { x: 0, y: 0 }; i < 3; i++, p = { x: p.x + i, y: i }) out += read(p) + ",";
for (const key in { a: 1, b: 2 }) {
  let r: P = { x: key.length, y: 0 };
  r = shift(r);
  out += read(r) + ";";
}
console.log(out, points.map(read).join(" "), objects.map((c) => c.v).join(" "));
const set = new Set<P>([{ x: 1, y: 2 }, { x: 3, y: 4 }]);
const map = new Map<string, C>([["a", new C(1)], ["b", new C(2)]]);
function* gen(): Generator<P> { yield { x: 5, y: 6 }; yield { x: 7, y: 8 }; }
let out2 = "";
for (let p of set) {
  out2 += read(p) + " ";
  p = { x: p.x + 10, y: 0 };
  out2 += read(p) + " ";
  p = shift(p);
  out2 += read(p) + ";";
}
for (let c of map.values()) {
  c = new C(c.v * 7);
  out2 += c.v + ";";
}
for (let p of gen()) {
  p = shift(p);
  out2 += read(p) + ";";
}
const holey: P[] = [{ x: 1, y: 1 }];
holey[3] = { x: 2, y: 2 };
for (let p of holey) {
  if (p === undefined) continue;
  p = shift(p);
  out2 += read(p) + ";";
}
console.log(out2, [...set].map(read).join(" "), [...map.values()].map((c) => c.v).join(" "));
