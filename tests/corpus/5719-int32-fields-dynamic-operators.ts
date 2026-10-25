// Class instances that reach checked-dynamic code in a program that also uses
// arithmetic on dynamic operands: integer fields keep their values when read
// statically and through dynamic views, a field set to a fraction keeps the
// fraction, and `+`, the other arithmetic and bitwise operators, `++` and
// unary `+` on dynamic operands match Node.

class Span {
  pos: number;
  end: number;
  scale: number;
  constructor(pos: number, end: number) {
    this.pos = pos | 0;
    this.end = end | 0;
    this.scale = 1;
  }
  get length(): number {
    return this.end - this.pos;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function key(mode: number, name: string, config: any): string {
  return mode + "|" + config + "|" + name;
}

const spans: Span[] = [];
for (let i = 0; i < 5; i++) spans.push(new Span(i * 10, i * 10 + i + 3));

const views: unknown[] = spans.map((span) => span);
for (const view of views) {
  const record = view as { pos: number; end: number };
  console.log(record.pos, record.end, JSON.stringify(view));
}

spans[2]!.scale = 0.25;
for (const span of spans) console.log(span.pos, span.end, span.scale, span.length);

console.log(key(0, "a", JSON.parse('"tsconfig.json"')), key(99, "b", JSON.parse("null")), key(-1, "c", JSON.parse("1.5")));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function combine(config: any, step: any): number {
  let counter = step;
  counter++;
  return +config + (config * 2 - 1) + (config | 0) + ~config + (config << 1) + counter;
}
console.log(combine(JSON.parse("7"), JSON.parse('"3"')), combine(JSON.parse('"2.5"'), JSON.parse("null")));
console.log(combine(JSON.parse("true"), JSON.parse("-1")), combine(JSON.parse("[]"), JSON.parse('"x"')));
const loose: unknown = JSON.parse('{"pos": 1.5, "end": 2}');
const sum: unknown = (loose as { pos: number }).pos + spans[0]!.end;
console.log(sum, typeof sum);

const big = new Span(2147483647, -2147483648);
const bigView: unknown = big;
console.log(big.pos, big.end, big.length, JSON.stringify(bigView));
