// Object.values over typed values seen as unknown: field order, optional
// fields, value identity, class instances, arrays, strings, and nullish
// receivers.
const valuesOf = (o: unknown): unknown[] => Object.values(o as object);
type Row = { id: number; name: string; big: number; ok: boolean; note?: string; items: number[] };
const items = [1, 2, 3];
const r: Row = { id: 7, name: "seven", big: 1e21, ok: true, items };
const s: Row = { id: -0, name: "", big: 0.1, ok: false, note: "n", items: [] };
console.log(valuesOf(r));
console.log(valuesOf(s));
console.log(valuesOf(r).length, valuesOf(s).length);
console.log(valuesOf(r)[4] === items, Object.is(valuesOf(s)[0], -0));

let total = 0;
for (const v of valuesOf(r)) if (typeof v === "number") total += v;
console.log(total);

// Each call returns a new array the caller may change.
const first: any[] = valuesOf(r);
first.push("added");
first[0] = "changed";
console.log(first.length, valuesOf(r)[0], r.id);

class Pair {
  left: string;
  right: number;
  constructor(left: string, right: number) {
    this.left = left;
    this.right = right;
  }
}
console.log(valuesOf(new Pair("l", 2)));
console.log(valuesOf([5, "six", undefined]), valuesOf("hi"), valuesOf(3), valuesOf(true));

for (const bad of [null, undefined]) {
  try {
    valuesOf(bad);
  } catch (e) {
    console.log((e as Error).name, (e as Error).message);
  }
}
