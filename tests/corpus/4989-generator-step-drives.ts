// Compiler-driven loops over generators of every yield representation:
// numbers, booleans, strings, records, arrays, unions, optional values,
// nested drives and class instances; spread and Array.from drains.
class P {
  x: number;
  constructor(x: number) {
    this.x = x;
  }
}
function* nums(n: number): Generator<number, void, undefined> {
  for (let i = 0; i < n; i++) yield i / 2;
}
function* strs(n: number): Generator<string, void, undefined> {
  for (let i = 0; i < n; i++) yield "s".repeat(i);
}
function* arrays(n: number): Generator<number[], void, undefined> {
  for (let i = 0; i < n; i++) yield [i, i + 1];
}
function* unions(n: number): Generator<number | string, void, undefined> {
  for (let i = 0; i < n; i++) yield i % 2 === 0 ? i : "odd" + i;
}
function* maybe(n: number): Generator<P | undefined, void, undefined> {
  for (let i = 0; i < n; i++) yield i % 2 === 0 ? new P(i) : undefined;
}
function* objs(n: number): Generator<P, string, undefined> {
  for (let i = 0; i < n; i++) yield new P(i * 10);
  return "unused";
}
let a = 0;
for (const x of nums(9)) a += x;
let b = "";
for (const s of strs(4)) b += s + "|";
let c = 0;
for (const [x, y] of arrays(4)) c += x * y;
const u: string[] = [];
for (const v of unions(5)) u.push(typeof v === "number" ? "n" + v : v);
let d = 0;
for (const p of maybe(6)) d += p === undefined ? 100 : p.x;
let e = 0;
for (const n of nums(8)) for (const x of nums(n)) e += x;
let f = 0;
for (const p of objs(4)) f += p.x;
console.log(a, b, c, u.join(","), d, e, f);
console.log([...strs(3)].join(","), Array.from(objs(3)).map((p) => p.x).join(","));
console.log(JSON.stringify([...unions(4)]), [...maybe(3)].map((p) => (p ? p.x : "-")).join(","));
let reassigned = -1;
for (reassigned of nums(3)) void 0;
console.log(reassigned);
var hoisted = 0;
var last = -1;
for (var v of nums(4)) {
  hoisted += v;
  last = v;
}
console.log(hoisted, last);
