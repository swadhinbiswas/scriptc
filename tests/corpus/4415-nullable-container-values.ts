// Unions of one array, Map or Set and `undefined` / `null` are the container
// pointer itself, retained through a NULL-skipping wrapper. Pins class fields,
// returns, ?. / ?? / truthiness, identity equality, arrays of nullable arrays
// (JSON, inspect, indexOf/includes), Map values holding nullable arrays, the
// get-or-create bucket idiom, optional record fields of each kind, unknown,
// captures, async payloads, and a hot loop.

class Node {
  kids: Node[] | undefined;
  tags: Map<string, number> | null = null;
  seen?: Set<number>;
  name: string;
  constructor(name: string) {
    this.name = name;
  }
}
function kidsOf(n: Node): Node[] | undefined {
  return n.kids;
}
function count(xs: number[] | undefined): number {
  return xs === undefined ? -1 : xs.length;
}
const root = new Node("root");
const leaf = new Node("leaf");
root.kids = [leaf];
console.log(kidsOf(root)?.length, kidsOf(leaf)?.length ?? "none", (kidsOf(leaf) ?? []).length, !!kidsOf(leaf), !!root.kids);
const lists: (number[] | undefined)[] = [[1, 2], undefined, [], [3]];
console.log(lists.map(count).join(","), lists.map((l) => (l ? "T" : "F")).join(""), JSON.stringify(lists), lists);
const shared = [9];
const e1: number[] | undefined = shared;
const e2: number[] | undefined = shared;
const e3: number[] | undefined = [9];
console.log(e1 === e2, e1 === e3, e1 !== undefined, lists.indexOf(undefined), lists.includes(e1));
root.tags = new Map([["a", 1]]);
leaf.tags = null;
function tagA(n: Node): number | string {
  return n.tags?.get("a") ?? "no";
}
console.log(tagA(root), tagA(leaf), root.tags === null, leaf.tags === null, root.tags?.size);
root.seen = new Set([1, 2, 3]);
console.log(root.seen?.has(2), leaf.seen?.has(2) ?? "unset", leaf.seen === undefined, root.seen?.size);
const byName = new Map<string, string[] | undefined>();
byName.set("x", ["p", "q"]);
byName.set("u", undefined);
console.log(byName.get("x")?.join("+"), byName.get("u") ?? "U", byName.get("z") ?? "Z");
const grouped = new Map<string, string[]>();
for (const w of ["apple", "avocado", "banana"]) {
  const k = w[0]!;
  let bucket = grouped.get(k);
  if (bucket === undefined) {
    bucket = [];
    grouped.set(k, bucket);
  }
  bucket.push(w);
}
console.log([...grouped.entries()].map(([k, v]) => `${k}:${v.join("/")}`).join(" "));
interface Cfg {
  list?: number[];
  opts: Map<string, number> | null;
  ids: Set<string> | null | undefined;
}
const c1: Cfg = { opts: null, ids: undefined };
const c2: Cfg = { list: [1], opts: new Map([["k", 2]]), ids: new Set(["s"]) };
console.log(JSON.stringify({ l1: c1.list, l2: c2.list }), c1, c2, "list" in c1, c2.ids?.has("s"), c1.ids === undefined);
const u: unknown = c2.list;
const u2: unknown = c1.list;
console.log(Array.isArray(u), u2 === undefined);
let held: number[] | undefined;
const grab = (xs: number[] | undefined) => {
  held = xs ?? held;
};
grab([5, 6]);
grab(undefined);
console.log(held?.join(","));
async function load(ok: boolean): Promise<string[] | undefined> {
  await null;
  return ok ? ["done"] : undefined;
}
const ps: Promise<string[] | undefined>[] = [load(true), load(false)];
Promise.all(ps).then((r) => console.log("async", r.map((x) => (x === undefined ? "U" : x.join())).join(",")));
let total = 0;
for (let i = 0; i < 20000; i++) {
  const l = lists[i % 4];
  total += count(l);
}
console.log("total", total);
