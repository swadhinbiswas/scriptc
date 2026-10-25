// Numeric index and length reads on values typed unknown: JSON arrays,
// typed arrays seen as unknown, out-of-range, negative, fractional, NaN,
// -0 and very large indexes, strings, typed byte arrays and plain objects
// with numeric keys.
function at(u: any, i: number): string {
  const v = u[i];
  return v === undefined ? "undefined" : typeof v === "object" ? JSON.stringify(v) : String(v);
}
function len(u: any): string {
  return String(u.length);
}
const json: unknown[] = JSON.parse('[10, "b", null, [1, 2], {"k": 1}]');
const indexes = [0, 1, 2, 3, 4, 5, -1, 1.5, NaN, -0, 4294967294, 4294967295, 1e21, Infinity];
console.log(indexes.map((i) => at(json, i)).join(" "), len(json));

const typed: number[] = [1.5, 2.5, 3.5];
const view: unknown[] = typed.map((x) => x as unknown);
const live: any = typed;
console.log(at(view, 0), at(view, 2), at(view, 3), len(view), at(live, 1), len(live));
typed.push(4.5);
typed[0] = -1;
console.log(at(live, 0), at(live, 3), len(live));

const words: unknown = "héllo";
console.log(at(words, 0), at(words, 1), at(words, 9), len(words));
const bytes: unknown = new Uint8Array([7, 8, 9]);
console.log(at(bytes, 0), at(bytes, 2), at(bytes, 3), len(bytes));
const object: unknown = JSON.parse('{"0": "zero", "1": "one", "length": 7}');
console.log(at(object, 0), at(object, 1), at(object, 2), len(object));
const fn: unknown = (a: number, b: number) => a + b;
console.log(len(fn), at(fn, 0));

const items: any = json;
let total = 0;
for (let i = 0; i < items.length; i++) {
  const v: unknown = items[i];
  if (typeof v === "number") total += v;
}
console.log(total);
for (const bad of [null, undefined]) {
  try {
    at(bad, 0);
  } catch (e) {
    console.log(e instanceof TypeError, (e as Error).message);
  }
  try {
    len(bad);
  } catch (e) {
    console.log(e instanceof TypeError, (e as Error).message);
  }
}
