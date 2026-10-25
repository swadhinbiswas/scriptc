// Reflection that reads class instances through `unknown`: Object.keys,
// Object.values, Object.entries, for-in, own-key lists, Object.hasOwn,
// typeof, toString and inspection. These reads store nothing, so the
// int32 fields of the classes they see stay exact, and the reflected keys,
// values and inspected output match Node's.

import { inspect } from "node:util";

class Span {
  kind: number;
  pos: number;
  end: number;
  next: Span | undefined;
  constructor(kind: number, pos: number, end: number) {
    this.kind = kind | 0;
    this.pos = pos | 0;
    this.end = end | 0;
    this.next = undefined;
  }
  width(): number {
    return this.end - this.pos;
  }
}

class Token extends Span {
  flags: number;
  constructor(kind: number, pos: number, end: number, flags: number) {
    super(kind, pos, end);
    this.flags = flags & 0xff;
  }
}

function describe(x: unknown): string {
  if (typeof x !== "object" || x === null) return String(x);
  const keys = Object.keys(x);
  const values = Object.values(x).map((v) => (typeof v === "object" ? typeof v : String(v)));
  const entries = Object.entries(x).map(([k, v]) => k + "=" + typeof v);
  let walked = "";
  for (const k in x) walked += k + ";";
  const name = (x as object).constructor.name;
  return [
    name,
    typeof x,
    Object.prototype.toString.call(x),
    (x as object).toString(),
    Object.getOwnPropertyNames(x).join(","),
    Reflect.ownKeys(x).length,
    Object.hasOwn(x, "flags"),
    keys.join(","),
    values.join(","),
    entries.join(","),
    walked,
  ].join(" | ");
}

const spans: Span[] = [];
for (let i = 0; i < 4; i++) {
  const s = i % 2 === 0 ? new Span(i, i * 10, i * 10 + 7) : new Token(i, i * 10, i * 10 + 3, i * 37);
  if (spans.length > 0) spans[spans.length - 1]!.next = s;
  spans.push(s);
}

for (const s of spans) console.log(describe(s));
console.log(describe(spans[0]!.next));
const third = spans[2]!;
const seen: unknown = [third.kind, third.pos, third.end];
console.log(seen);
console.log(inspect(seen, { depth: 0 }));
console.log(describe(42), describe(null), describe("text"));

let total = 0;
for (const s of spans) total += s.width() + (s.kind << 3) + (s instanceof Token ? s.flags : 0);
console.log(total, total | 0, spans[3]!.end >>> 1);
