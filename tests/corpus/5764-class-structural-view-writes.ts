// A class instance flowing into an anonymous or interface record type is the
// same object under Node: writes through the record view reach the instance.
// Every flow form below writes through the view and prints the instance.
class Counter {
  count = 0;
}
class Cell {
  v = 0;
}

// Parameters: a large write and repeated compound writes.
function addBytes(o: { count: number }, n: number): void {
  o.count += n;
}
const counter = new Counter();
for (let i = 0; i < 3; i++) addBytes(counter, 1_000_000_000);
console.log("param", counter.count);

function setHalf(o: { v: number }): void {
  o.v = 7.5;
}
const a = new Cell();
a.v = 7;
setHalf(a);
console.log("param write", a.v);

// Assertions, directly and through unknown.
const b = new Cell();
const viaUnknown = b as unknown as { v: number };
viaUnknown.v = 1.25;
const direct = b as { v: number };
direct.v += 1;
console.log("assertion", b.v);

// Array elements: push, a literal, and a for-of write.
const list: { v: number }[] = [];
const c = new Cell();
list.push(c);
const d = new Cell();
const literal: { v: number }[] = [d, { v: 5 }];
for (const o of list) o.v = 1e10;
for (const o of literal) o.v += 2;
console.log("array", c.v, d.v, literal[1]!.v);

// Returns, later assignments, and nested record fields.
const e = new Cell();
function viewOf(): { v: number } {
  return e;
}
viewOf().v = 3;
let later: { v: number } = { v: -1 };
later = e;
later.v *= 2;
const holder: { inner: { v: number } } = { inner: e };
holder.inner.v += 0.5;
console.log("return/assign/nested", e.v, later.v);

// A class field typed with the record, and a chain of record parameters.
class Holder {
  item: { v: number };
  constructor(item: { v: number }) {
    this.item = item;
  }
}
const f = new Cell();
new Holder(f).item.v = 6;
function inner(o: { v: number }): void {
  o.v += 9;
}
function outer(o: { v: number }): void {
  inner(o);
}
outer(f);
console.log("field/chain", f.v);

// Map values, optional parameters and unions of records.
const byName = new Map<string, { v: number }>();
const g = new Cell();
byName.set("g", g);
byName.get("g")!.v = 5;
function maybe(o: { v: number } | null): void {
  if (o) o.v += 2;
}
maybe(g);
maybe(null);
type Either = { v: number } | { w: string };
function touch(u: Either): void {
  if ("v" in u) u.v += 4;
}
touch(g);
touch({ w: "x" });
console.log("map/union", g.v);

// An interface without `implements`, and an implemented interface passed on
// to an anonymous record parameter.
interface HasV {
  v: number;
}
interface Marked {
  v: number;
}
class Implemented implements Marked {
  v = 0;
}
function bump(o: HasV): void {
  o.v += 2;
}
function setEight(o: { v: number }): void {
  o.v = 8;
}
function pass(o: Marked): void {
  setEight(o);
}
const h = new Cell();
bump(h);
const i = new Implemented();
pass(i);
console.log("interfaces", h.v, i.v);

// Increments, closures, methods and accessors through the view.
const j = new Cell();
const view: { v: number } = j;
const bumpView = () => {
  view.v++;
  ++view.v;
};
bumpView();
console.log("increment", j.v, view.v--, j.v);
class Ticker {
  n = 0;
  inc(): void {
    this.n++;
  }
}
function twice(o: { n: number; inc(): void }): void {
  o.inc();
  o.n += 10;
}
const ticker = new Ticker();
twice(ticker);
class Doubling {
  private raw = 0;
  get v(): number {
    return this.raw;
  }
  set v(x: number) {
    this.raw = x * 2;
  }
}
const doubling = new Doubling();
setHalf(doubling);
console.log("method/accessor", ticker.n, doubling.v);

// A conditional value: only the class arm is the instance.
const k = new Cell();
const pick = (flag: boolean): { v: number } => (flag ? k : { v: -1 });
pick(true).v = 13;
pick(false).v = 99;
console.log("conditional", k.v);
