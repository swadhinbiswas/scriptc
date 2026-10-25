// JSON.parse into declared shapes: member names compared directly against
// the text and through the general scan, in and out of declaration order,
// with escapes, unknown, duplicate and missing members, scalar and nested
// array elements, whitespace, and malformed input.
interface Point {
  x: number;
  y: number;
  id: string;
  ok: boolean;
}
interface Named {
  a: number;
  "a\"b": number;
  "back\\slash": string;
  "tab\tkey": boolean;
  "ключ": number;
  longerThanEightBytes: string;
  idx: number;
  id: number;
}
interface Nested {
  values: number[];
  words: string[];
  flags: boolean[];
  points: Point[];
  grid: number[][];
}

function attempt<T>(label: string, parse: () => T, show: (value: T) => string): void {
  try {
    console.log(label, show(parse()));
  } catch (error) {
    console.log(label, (error as Error).name, (error as Error).message);
  }
}
const showPoint = (p: Point): string => `${p.x},${p.y},${p.id},${p.ok}`;
const showNamed = (n: Named): string =>
  [n.a, n["a\"b"], n["back\\slash"], n["tab\tkey"], n["ключ"], n.longerThanEightBytes, n.idx, n.id].join("|");

// Declaration order, reversed order, mixed order, whitespace.
attempt("order", () => JSON.parse('{"x":1,"y":2,"id":"p","ok":true}') as Point, showPoint);
attempt("reversed", () => JSON.parse('{"ok":false,"id":"q","y":-2.5,"x":1e3}') as Point, showPoint);
attempt("mixed", () => JSON.parse('{"y":0,"x":-0,"ok":true,"id":""}') as Point, showPoint);
attempt("spaces", () => JSON.parse(' {\n  "x" : 4 ,\t"y":5,\r\n "id" :"s", "ok":\ntrue } ') as Point, showPoint);

// Escaped spellings of plain names take the general scan.
attempt("escaped key", () => JSON.parse('{"\\u0078":7,"y":8,"i\\u0064":"e","ok":false}') as Point, showPoint);
attempt("escaped value", () => JSON.parse('{"x":1,"y":2,"id":"a\\"b\\\\c\\u00e9","ok":true}') as Point, showPoint);

// Names holding quotes, backslashes, control bytes, non-ASCII, more than
// eight bytes, and names that are prefixes of other names.
const named =
  '{"a":1,"a\\"b":2,"back\\\\slash":"bs","tab\\tkey":true,"ключ":5,"longerThanEightBytes":"long","idx":6,"id":7}';
attempt("named", () => JSON.parse(named) as Named, showNamed);
attempt(
  "named reversed",
  () =>
    JSON.parse(
      '{"id":70,"idx":60,"longerThanEightBytes":"L","ключ":50,"tab\\tkey":false,"back\\\\slash":"B","a\\"b":20,"a":10}',
    ) as Named,
  showNamed,
);
attempt("prefix key", () => JSON.parse('{"x":1,"xx":9,"y":2,"id":"p","ok":true}') as Point, showPoint);

// Unknown members are skipped; duplicates and missing members follow Node.
attempt("unknown", () => JSON.parse('{"x":1,"extra":{"deep":[1,{"z":null}]},"y":2,"id":"u","ok":true,"more":"m"}') as Point, showPoint);
attempt("duplicate", () => JSON.parse('{"x":1,"y":2,"x":3,"id":"d","ok":true}') as Point, showPoint);

// Scalar and nested elements.
const nested =
  '{"values":[1,-2.5,3e2,0],"words":["a","","é\\n"],"flags":[true,false],"points":[{"x":1,"y":2,"id":"a","ok":true},{"ok":false,"id":"b","y":4,"x":3}],"grid":[[1,2],[],[3]]}';
const showNested = (n: Nested): string =>
  [n.values.join(","), n.words.join(","), n.flags.join(","), n.points.map(showPoint).join(";"), n.grid.map((r) => r.join(",")).join(";")].join(" / ");
attempt("nested", () => JSON.parse(nested) as Nested, showNested);
attempt("empty arrays", () => JSON.parse('{"values":[],"words":[],"flags":[],"points":[],"grid":[]}') as Nested, showNested);

// Many records, alternating key orders.
const parts: string[] = [];
for (let i = 0; i < 2000; i++)
  parts.push(
    i % 3 === 0
      ? `{"x":${i},"y":${i * 0.5},"id":"r${i}","ok":${i % 2 === 0}}`
      : `{"ok":${i % 2 === 0},"x":${i},"id":"r${i}","y":${-i}}`,
  );
attempt(
  "many",
  () => JSON.parse("[" + parts.join(",") + "]") as Point[],
  (ps) => {
    let sum = 0;
    for (const p of ps) sum += p.x + p.y + p.id.length + (p.ok ? 1 : 0);
    return `${ps.length} ${sum} ${showPoint(ps[1999]!)}`;
  },
);

// Malformed text near member names fails to parse.
const bad = [
  '{"x":1,"y":2,"id":"p","ok":true',
  '{"x":1,"y":2,"id":"p","ok"',
  '{"x":1,"y":2,"id":"p","o',
  '{"x":1,"y":2,"id":"p","ok":tru}',
  '{"x":1 "y":2,"id":"p","ok":true}',
  '{"x":1,"y":2,"id":"p","ok":true,}',
  '{"x\u0001":1}',
  '{"x":1,"y":2,"id":"p","ok":true}}',
  '{x:1}',
];
for (const text of bad) {
  let parsed = true;
  try {
    JSON.parse(text) as Point;
  } catch (error) {
    parsed = !(error instanceof SyntaxError);
  }
  console.log("bad", JSON.stringify(text), parsed ? "parsed" : "SyntaxError");
}
