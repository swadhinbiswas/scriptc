// Unions of one record shape and `undefined` (or `null`) are the record
// pointer itself: NULL is the unit arm. Optional record fields of such a
// type also distinguish an ABSENT property from a present `undefined`
// (a module-scope sentinel), which every key surface must observe: `in`,
// Object.keys, JSON, spread/clone, console.log, conversion to `unknown`,
// and checked JSON.parse casts back into the typed shape.

interface Pos {
  line: number;
  col: number;
}

interface Span {
  start: Pos;
  end?: Pos;
  note?: Pos | undefined;
}

interface Link {
  value: number;
  next: Link | null;
}

function show(p: Pos | undefined): string {
  return p === undefined ? "none" : `${p.line}:${p.col}`;
}

function pick(list: Pos[], line: number): Pos | undefined {
  for (const p of list) if (p.line === line) return p;
  return undefined;
}

const a: Pos = { line: 1, col: 2 };
const b: Pos = { line: 3, col: 4 };
console.log("pick", show(pick([a, b], 3)), show(pick([a, b], 9)), pick([a, b], 1) === a);

// Optional fields: absent, present-undefined, and present values.
const s1: Span = { start: a };
const s2: Span = { start: a, end: b, note: undefined };
const s3: Span = { start: b, end: pick([a], 7), note: pick([a, b], 1) };
function describeSpan(s: Span): string {
  return [show(s.end), show(s.note), "end" in s, "note" in s, Object.keys(s).join("|")].join(" ");
}
console.log("span", describeSpan(s1), describeSpan(s2), describeSpan(s3));
console.log("json", JSON.stringify(s1), JSON.stringify(s2), JSON.stringify(s3));
console.log("inspect", s1, s2, s3);
const copy: Span = { ...s3 };
const clone: Span = { ...s1, start: b };
console.log("spread", JSON.stringify(copy), JSON.stringify(clone), "end" in clone, copy.note === a);

// Writing and deleting optional fields.
const m: Span = { start: a };
m.end = b;
console.log("set", show(m.end), "end" in m, JSON.stringify(m));
m.end = undefined;
console.log("undef", show(m.end), "end" in m, JSON.stringify(m), Object.keys(m).join("|"));
delete m.end;
console.log("deleted", show(m.end), "end" in m, Object.keys(m).join("|"));

// Conversion to unknown and checked casts back.
const asUnknown: unknown = s3;
console.log("unknown", JSON.stringify(asUnknown));
const parsed = JSON.parse('{"start":{"line":5,"col":6},"note":{"line":7,"col":8}}') as Span;
console.log("parsed", show(parsed.start), show(parsed.end), show(parsed.note), "end" in parsed, "note" in parsed);
const parsed2 = JSON.parse('{"start":{"line":5,"col":6},"end":null}') as { start: Pos; end: Pos | null };
console.log("parsed2", show(parsed2.start), parsed2.end === null, JSON.stringify(parsed2));

// Linked records through `| null`, arrays and maps of nullable records.
let head: Link | null = null;
for (let i = 0; i < 5; i++) head = { value: i, next: head };
let sum = 0;
let count = 0;
for (let cur = head; cur !== null; cur = cur.next) {
  sum += cur.value;
  count++;
}
console.log("list", sum, count, head?.next?.next?.value, JSON.stringify(head?.next?.next?.next ?? null));
const slots: (Pos | undefined)[] = [a, undefined, b];
console.log("slots", slots.map(show).join(","), JSON.stringify(slots), slots.indexOf(b), slots.includes(undefined));
const index = new Map<number, Pos | null>();
index.set(1, a);
index.set(2, null);
console.log("index", JSON.stringify(index.get(1) ?? null), index.get(2) === null, index.get(3) === undefined);

// Equality, nullish, optional chaining and truthiness.
const same: Pos | undefined = s3.note;
console.log("eq", same === a, same !== b, s1.end === s2.end, !!s1.end, !!s3.note, s3.note?.col ?? -1, s1.end?.col ?? -1);

// Captures and generic helpers.
let last: Pos | undefined;
const remember = (p: Pos | undefined): void => {
  last = p ?? last;
};
remember(a);
remember(undefined);
console.log("captured", show(last));
function firstDefined<T>(xs: (T | undefined)[]): T | undefined {
  for (const x of xs) if (x !== undefined) return x;
  return undefined;
}
console.log("generic", show(firstDefined<Pos>([undefined, b, a])), show(firstDefined<Pos>([])));

// Async payload.
async function load(line: number): Promise<Pos | undefined> {
  await null;
  return pick([a, b], line);
}
load(3).then((p) => console.log("async", show(p)));
load(4).then((p) => console.log("async", show(p)));
