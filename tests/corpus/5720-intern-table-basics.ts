import { InternTable } from "@scriptc/experimental";

// InternTable (@scriptc/experimental) on one thread: string and number
// keys, first insertion wins, values are published, and tables are opened
// by name. Node.js prints the same.

class Point {
  readonly x: number;
  readonly y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

const points = new InternTable<string, Point>("basics.points");
let calls = 0;
function point(key: string, x: number, y: number): Point {
  return points.getOrInsertComputed(key, () => {
    calls++;
    return new Point(x, y);
  });
}

const a = point("a", 1, 2);
const b = point("a", 3, 4);
console.log(a === b, a.x, a.y, calls, points.size);
console.log(points.has("a"), points.has("b"), points.get("a") === a, points.get("b"));
console.log(points.get("a")?.y ?? -1, points.get("b")?.y ?? -1);

// The callback receives the key.
const named = points.getOrInsertComputed("p:7", (key) => new Point(Number(key.slice(2)), key.length));
console.log(named.x, named.y, points.size);

// getOrInsert stores its argument only when the key is absent.
const fresh = new Point(5, 6);
const stored = points.getOrInsert("c", fresh);
const other = new Point(7, 8);
console.log(stored === fresh, points.getOrInsert("c", other) === fresh, points.size);

// Stored values are immutable; the unused argument stays writable.
function attempt(what: string, write: () => void): void {
  try {
    write();
    console.log(what, "wrote");
  } catch (e) {
    console.log(what, (e as Error).name, (e as Error).message);
  }
}
attempt("stored", () => {
  (a as { x: number }).x = 10;
});
attempt("argument", () => {
  (fresh as { y: number }).y = 10;
});
attempt("unused", () => {
  (other as { y: number }).y = 10;
});
console.log(other.y);

// Every construction with one name opens the same table.
const again = new InternTable<string, Point>("basics.points");
console.log(again === points, again.size, again.get("a") === a, typeof again);
console.log(again);
console.log([again], { table: again });

// Number keys compare by SameValueZero.
const names = new InternTable<number, string>("basics.names");
console.log(names.getOrInsert(-0, "zero"), names.getOrInsert(0, "positive"), names.get(-0));
console.log(names.get(NaN), names.getOrInsert(NaN, "nan"), names.get(0 / 0), names.size);
console.log(names.getOrInsert(1.5, "x"), names.get(1.5), names.get(1.25), names.has(Infinity));
for (let i = 0; i < 1000; i++) names.getOrInsert(i * 3, `n${i}`);
let found = 0;
for (let i = 0; i < 3000; i++) if (names.has(i)) found++;
console.log(names.size, found, names.get(2997), names.get(2998));

// String keys compare by content.
const counts = new InternTable<string, number>("basics.counts");
const parts = ["al", "pha"];
console.log(counts.getOrInsert(parts.join(""), 1), counts.getOrInsert("alpha", 2), counts.get("alp" + "ha"));
console.log(counts.getOrInsert("", 3), counts.get(""), counts.has(" "), counts.getOrInsert("é", 4), counts.get("é"));
for (let i = 0; i < 2000; i++) counts.getOrInsert(`key-${i}`, i);
let total = 0;
for (let i = 0; i < 2000; i++) total += counts.get(`key-${i}`) ?? 0;
console.log(counts.size, total, counts.get("key-2000"));

// A callback that stores its own key: the first stored value wins.
const nested = new InternTable<string, string>("basics.nested");
const result = nested.getOrInsertComputed("k", () => {
  nested.getOrInsert("k", "inner");
  return "outer";
});
console.log(result, nested.get("k"), nested.size);

// A callback that throws stores nothing.
try {
  points.getOrInsertComputed("thrown", () => {
    throw new Error("no point");
  });
} catch (e) {
  console.log((e as Error).message, points.has("thrown"));
}

// Callbacks that are not function expressions, and evaluation order.
const order: string[] = [];
function tableOf(label: string): InternTable<string, Point> {
  order.push(`table ${label}`);
  return points;
}
function keyOf(key: string): string {
  order.push(`key ${key}`);
  return key;
}
function valueOf(x: number): Point {
  order.push(`value ${x}`);
  return new Point(x, x);
}
const make = (key: string): Point => {
  order.push(`make ${key}`);
  return new Point(key.length, 0);
};
function makeNamed(key: string): Point {
  order.push(`named ${key}`);
  return new Point(0, key.length);
}
console.log(tableOf("1").getOrInsert(keyOf("a"), valueOf(1)) === a);
console.log(tableOf("2").getOrInsert(keyOf("order"), valueOf(2)).x);
console.log(tableOf("3").getOrInsertComputed(keyOf("made"), make).x);
console.log(tableOf("4").getOrInsertComputed(keyOf("made"), make).x);
console.log(tableOf("5").getOrInsertComputed(keyOf("named"), makeNamed).y);
console.log(tableOf("6").getOrInsertComputed(keyOf("a"), () => valueOf(3)) === a);
console.log(order.join("; "));

// Optional receivers.
function maybe(open: boolean): InternTable<string, Point> | undefined {
  return open ? points : undefined;
}
console.log(maybe(true)?.get("a") === a, maybe(false)?.get("a"), maybe(true)?.size, maybe(false)?.size);
console.log(maybe(true)?.has("c"), maybe(false)?.has("c"), maybe(true)?.getOrInsert("c", new Point(0, 0)) === fresh);
