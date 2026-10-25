// Functions that return one of their parameters, or another function's
// result, give the same values as Node whether the result is only read or
// kept, and objects that can be changed after construction keep sharing
// one identity.
interface Vec {
  x: number;
  y: number;
}
function scale(v: Vec, k: number): Vec {
  return { x: v.x * k, y: v.y * k };
}
function normalize(v: Vec): Vec {
  const len = Math.sqrt(v.x * v.x + v.y * v.y);
  return len === 0 ? v : scale(v, 1 / len);
}
function either(a: Vec, b: Vec, first: boolean): Vec {
  return first ? a : b;
}
function halve(v: Vec, times: number): Vec {
  return times === 0 ? v : halve(scale(v, 0.5), times - 1);
}
function dot(a: Vec, b: Vec): number {
  return a.x * b.x + a.y * b.y;
}
interface Cell {
  value: number;
}
function same(c: Cell): Cell {
  return c;
}
const kept: Vec[] = [];

let total = 0;
for (let i = 0; i < 6; i++) {
  const v = { x: i, y: i % 3 };
  const n = normalize(v);
  total += dot(n, v) + dot(either(v, n, i % 2 === 0), { x: 1, y: 1 });
  total += dot(halve({ x: 8, y: i }, 3), v);
  kept.push(normalize({ x: 0, y: 0 }));
  const c: Cell = { value: i };
  const alias = same(c);
  alias.value += 10;
  total += c.value;
}
console.log(total.toFixed(6), kept.map((v) => `${v.x},${v.y}`).join(" "));
