// `string | undefined`, `string | null` and `string | null | undefined` are the
// string pointer itself (NULL / the null sentinel for the unit arms), retained
// through a NULL-skipping wrapper. Strings compare by content and are falsy
// when empty, so equality and truthiness keep their per-arm semantics. Pins
// locals, returns, narrowing, ??, ||, ?., typeof, equality against literals
// and computed strings, templates, JSON, inspect, Map values (typed and
// missing-key results), sorting and joining `(string | null)[]`, optional
// record fields, checked casts, unknown, captures, class fields, generators,
// async payloads, and a hot loop.

function pick(xs: string[], i: number): string | undefined {
  return i < xs.length ? xs[i] : undefined;
}
function show(s: string | undefined): string {
  return s === undefined ? "<u>" : `[${s}]`;
}
const xs = ["a", "", "ccc"];
const vals: (string | undefined)[] = [pick(xs, 0), pick(xs, 1), pick(xs, 5), "lit", undefined];
console.log(vals.map(show).join(","), vals.map((v) => (v ? "T" : "F")).join(""), vals.map((v) => typeof v).join(","));
console.log(vals.map((v) => v ?? "dflt").join(","), vals.map((v) => v || "falsy").join(","), vals.map((v) => v?.length ?? -1).join(","));
const a: string | undefined = pick(xs, 0);
const b: string | undefined = "a" + "";
const c: string | undefined = pick(xs, 9);
console.log(a === b, a !== b, a === "a", c === undefined, a === c, a == "a", b === "ab".slice(0, 1));
console.log(`${a}-${c}`, String(c), JSON.stringify({ a, c, n: null }), JSON.stringify(vals), vals);
const m = new Map<string, string | undefined>();
m.set("x", "1");
m.set("u", undefined);
console.log(show(m.get("x")), show(m.get("u")), show(m.get("zz")), m.has("u"));
const plain = new Map<number, string>();
plain.set(1, "one");
console.log(show(plain.get(1)), show(plain.get(2)), plain.get(1) ?? "none", plain.get(3) ?? "none");
const nn: (string | null)[] = ["q", null, "r"];
nn.sort((p, q) => (p ?? "").localeCompare(q ?? ""));
console.log(nn.map((s) => (s === null ? "null" : s)).join(","), nn.join("|"), nn.indexOf(null), nn.includes("r"));
const three: (string | null | undefined)[] = ["s", null, undefined, ""];
console.log(three.map((s) => (s === null ? "N" : s === undefined ? "U" : s === "" ? "E" : s)).join(""), three.map((s) => s == null).join(","), three.map((s) => (s ? 1 : 0)).join(""));
console.log(JSON.stringify(three), three);
interface Opt {
  name?: string;
  title: string | null;
}
const o1: Opt = { title: null };
const o2: Opt = { name: "n", title: "t" };
console.log(JSON.stringify([o1, o2]), o1, o2, "name" in o1, o2.name?.toUpperCase());
const parsed = JSON.parse('{"title":"x"}') as Opt;
console.log(show(parsed.name), parsed.title, "name" in parsed);
const u: unknown = c;
const u2: unknown = a;
console.log(u === undefined, u2 === "a", typeof u2);
let cap: string | undefined;
const setCap = (s: string | undefined) => {
  cap = s ?? cap;
};
setCap("one");
setCap(undefined);
console.log(show(cap));
class Holder {
  label: string | undefined;
  alt: string | null = null;
}
const h = new Holder();
h.label = pick(xs, 2);
h.alt = h.label ?? null;
console.log(show(h.label), h.alt, h);
function* gen(): Generator<string | undefined> {
  yield "g";
  yield undefined;
}
const gs: string[] = [];
for (const g of gen()) gs.push(show(g));
console.log(gs.join(","));
async function later(i: number): Promise<string | undefined> {
  await null;
  return pick(xs, i);
}
const ps: Promise<string | undefined>[] = [later(0), later(7)];
Promise.all(ps).then((r) => console.log("async", r.map(show).join(",")));
let total = 0;
for (let i = 0; i < 20000; i++) {
  const s = pick(xs, i % 4);
  if (s !== undefined) total += s.length;
}
console.log("total", total);
const labels: Record<string, string | null> = { a: "A", n: null };
for (const key of ["a", "n"]) console.log("index", key, labels[key] ?? "null", labels[key] === null);
