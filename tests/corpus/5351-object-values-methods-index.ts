// Read-only array methods and index reads applied directly to
// Object.values of unknown values: typed records and JSON objects,
// negative zero, nested containers, out-of-range and fractional indexes,
// and the empty-array reduce TypeError.
interface P { a: number; b: string; c: number[]; d?: boolean }
const p: P = { a: 1, b: "x", c: [2, 3] };
const u: any = p;
const j: any = JSON.parse('{"x":1,"y":"two","z":null,"w":-0}');
for (const v of [u, j]) {
  console.log(Object.values(v).every((x) => x !== undefined), Object.values(v).some((x) => typeof x === "string"));
  console.log(Object.values(v).findIndex((x) => x === null), Object.values(v).findIndex((x) => x === "x"));
  Object.values(v).forEach((x, i) => console.log(i, JSON.stringify(x), Object.is(x, -0)));
  console.log(Object.values(v).join("-"), Object.values(v).join());
  console.log(Object.values(v).reduce((acc: number, x) => acc + (typeof x === "number" ? x : 0), 0));
  console.log(Object.values(v).reduce((acc: unknown, x) => (acc === null ? x : acc)));
  console.log(Object.values(v).find((x) => typeof x === "string"), Object.values(v).includes(1), Object.values(v).indexOf("x"));
  const i = 7;
  console.log(Object.values(v)[0], Object.values(v)[1], Object.values(v)[-1], Object.values(v)[1.5], Object.values(v)[i]);
}
console.log(Object.values(u)[2] === p.c, Object.values(u).length);
try {
  const empty: any = JSON.parse("{}");
  console.log(Object.values(empty).reduce((a: unknown, b) => b));
} catch (e) {
  console.log(e instanceof TypeError, (e as Error).message);
}
