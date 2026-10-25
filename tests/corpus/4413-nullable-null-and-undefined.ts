// `C | null | undefined` (one reference arm, both unit arms) is the reference
// pointer itself: NULL is `undefined` and a module-scope immortal sentinel is
// `null`. Pins discrimination (=== null / === undefined / == null), truthiness,
// typeof, ?? and ?., equality, arrays, Map values (including `C | null` values
// widening to `C | null | undefined` on a missing key), optional record fields
// (absent vs null vs present) through JSON, inspect, `in` and checked casts,
// unknown, captures and async payloads.

class Item {
  id: number;
  next: Item | null | undefined;
  constructor(id: number) {
    this.id = id;
  }
}
interface Cfg {
  name: string;
  link?: Cfg | null;
}

function kind(v: Item | null | undefined): string {
  if (v === undefined) return "undef";
  if (v === null) return "null";
  return `item${v.id}`;
}
function loose(v: Item | null | undefined): string {
  return v == null ? "nullish" : `item${v.id}`;
}
const a = new Item(1);
const b = new Item(2);
a.next = b;
b.next = null;
const vals: (Item | null | undefined)[] = [a, null, undefined, b.next, a.next, new Item(3).next];
console.log(vals.map(kind).join(","), vals.map(loose).join(","));
console.log(vals.map((v) => (v ? "t" : "f")).join(""), vals.map((v) => typeof v).join(","));
console.log(kind(a.next?.next), kind(b.next ?? a), kind(a.next ?? null), a.next?.id ?? -1, (b.next as Item | null | undefined)?.id ?? -2);
const x: Item | null | undefined = vals[1];
const y: Item | null | undefined = vals[2];
console.log(x === null, x === undefined, y === null, y === undefined, x == y, x === y, vals[0] === a);
console.log(vals);
const m = new Map<string, Item | null | undefined>();
m.set("n", null);
m.set("u", undefined);
m.set("a", a);
console.log(kind(m.get("n")), kind(m.get("u")), kind(m.get("a")), kind(m.get("zz")), m.size);
const m2 = new Map<string, Item | null>();
m2.set("n", null);
m2.set("a", a);
console.log(kind(m2.get("n")), kind(m2.get("a")), kind(m2.get("q")));
const c1: Cfg = { name: "c1" };
const c2: Cfg = { name: "c2", link: null };
const c3: Cfg = { name: "c3", link: c1 };
console.log(JSON.stringify([c1, c2, c3]), c1, c2, c3, "link" in c1, "link" in c2);
const parsed = JSON.parse('[{"name":"p","link":null},{"name":"q"},{"name":"r","link":{"name":"s"}}]') as Cfg[];
console.log(parsed.map((p) => (p.link === null ? "null" : p.link === undefined ? "undef" : p.link.name)).join(","));
const u: unknown = c2.link;
const w: unknown = c1.link;
console.log(u === null, w === undefined);
let keep: Item | null | undefined = undefined;
const setKeep = (v: Item | null | undefined) => {
  keep = v ?? keep;
};
setKeep(null);
console.log(kind(keep));
setKeep(a);
setKeep(undefined);
console.log(kind(keep));
async function f(v: number): Promise<Item | null | undefined> {
  await null;
  return v === 0 ? null : v === 1 ? undefined : a;
}
const ps: Promise<Item | null | undefined>[] = [f(0), f(1), f(2)];
Promise.all(ps).then((r) => console.log("async", r.map(kind).join(",")));
// Index-signature reads of a `C | null` value: a stored null is NULL in the
// overflow map, so presence (not the pointer) decides a missing key.
const byKey: Record<string, Item | null> = { a, n: null };
for (const key of ["a", "n"]) console.log("index", key, kind(byKey[key]));
const wide: Record<string, Item | null | undefined> = { n: null, u: undefined };
for (const key of ["n", "u", "zz"]) console.log("index3", key, kind(wide[key]), key in wide);
