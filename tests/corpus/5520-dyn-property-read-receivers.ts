// Named property reads on values typed unknown: typed records with
// required, optional, absent and explicitly undefined fields, class
// instances with fields, getters and inherited members, a class's name,
// functions, errors, JSON objects and nullish receivers.
interface Item { id: number; name: string; tags?: string[]; note?: string }
const items: unknown[] = [
  { id: 1, name: "one", tags: ["a"] } as Item,
  { id: 2, name: "two", note: undefined } as Item,
  { id: 3, name: "three" } as Item,
  JSON.parse('{"id": 4, "name": "four", "tags": [], "extra": true}'),
];
function describe(u: any): string {
  return `${u.id} ${u.name} ${JSON.stringify(u.tags)} ${u.note} ${u.missing}`;
}
console.log(items.map(describe).join(" | "));

class Base {
  kind = "base";
  get label(): string {
    return `label:${this.kind}`;
  }
  hello(): string {
    return "hi";
  }
}
class Derived extends Base {
  extra = 42;
  constructor() {
    super();
    this.kind = "derived";
  }
}
const d: any = new Derived();
console.log(d.kind, d.extra, d.label, typeof d.hello, d.hello(), d.missing);
const ctor: any = Derived;
console.log(ctor.name);

function sum(a: number, b: number): number {
  return a + b;
}
const fn: any = sum;
console.log(fn.name, fn.length, typeof fn.apply, fn.missing);
const err: any = new TypeError("bad value");
console.log(err.name, err.message, err.missing);

let reads = 0;
for (let i = 0; i < 1000; i++) {
  const u: any = items[i % 4];
  const id: unknown = u.id;
  if (typeof id === "number") reads += id;
}
console.log(reads);
for (const bad of [null, undefined]) {
  try {
    describe(bad);
  } catch (e) {
    console.log(e instanceof TypeError, (e as Error).message);
  }
}
