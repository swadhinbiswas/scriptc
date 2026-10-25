/* oxlint-disable no-loss-of-precision -- Oracle inputs intentionally exercise numeric literal rounding. */
// Generates util.inspect oracle cases with Node as the oracle.
// Each line: <op>\t<arg-hex>\t<expected-hex>
//
//   node gen-inspect-cases.mjs > inspect-cases.txt
//
// Ops:
//   f64    — arg is decimal number text; expected = util.inspect(Number)
//   str    — arg is raw string bytes (WTF-8 for lone surrogates);
//            expected = util.inspect(string) at indentation 0
//   json   — arg is JSON text; expected = util.inspect(JSON.parse(arg)) —
//            this drives the LAYOUT engine (frames, break-length,
//            grid grouping, depth placeholders) through scr_insp_dyn
//   buffer — arg is raw bytes; expected = util.inspect(Buffer.from(bytes))
//
// All fields are hex-encoded ("-" = empty) so the file is unambiguous.
// Node v24 is the oracle (breakLength 80, compact 3, maxArrayLength 100,
// maxStringLength 10000 defaults).
import { inspect } from "node:util";

const hex = (buf) => (buf.length ? Buffer.from(buf).toString("hex") : "-");
const lines = [];
const emit = (op, argBytes, result) => {
  lines.push([op, hex(argBytes), hex(Buffer.from(result, "utf8"))].join("\t"));
};

// ── numbers ──────────────────────────────────────────────────────────
const numbers = [
  0,
  -0,
  1,
  -1,
  0.5,
  -0.5,
  1.5,
  123456789,
  -123456789,
  2 ** 53,
  -(2 ** 53),
  1e21,
  -1e21,
  1e-7,
  -1e-7,
  5e-324,
  1.7976931348623157e308,
  NaN,
  Infinity,
  -Infinity,
  3.141592653589793,
  100,
  1000000,
  0.1,
  0.30000000000000004,
  1234567890123456789,
  2 ** 31,
  -(2 ** 31),
  1e15,
  1e16,
  123.456,
  0.000001,
];
for (const n of numbers) {
  emit(
    "f64",
    Buffer.from(String(n) === "0" && Object.is(n, -0) ? "-0" : String(n), "utf8"),
    inspect(n),
  );
}

// ── strings (quoting ladder, escapes, splitting) ─────────────────────
const strings = [
  "",
  "a",
  "abc",
  "it's",
  'say "hi"',
  `it's "quoted"`,
  "a`b",
  "`tick`",
  `mix ' " \``,
  `dollar \${x} ' "`,
  "tab\there",
  "nl\nhere",
  "cr\rhere",
  "\x00\x01\x1f",
  "\x7f",
  "",
  " ",
  "backslash\\here",
  "\b\f\v",
  "unicode ✓ ok",
  "emoji 😀 wide",
  "日本語テキスト",
  "x".repeat(75),
  "x".repeat(76),
  "y".repeat(200),
  "line one\nline two\nline three",
  "long line padding padding padding padding padding padding padding X\n".repeat(3),
  "a\n",
  "a\n\nb",
  "\n",
  "short\nlines\nhere",
  "z".repeat(9999),
  "z".repeat(10000),
  "z".repeat(10001),
  "z".repeat(10002),
  "w".repeat(5000) + "\n" + "w".repeat(6000),
];
for (const s of strings) {
  emit("str", Buffer.from(s, "utf8"), inspect(s));
}
// Lone surrogates: WTF-8 bytes hand-encoded (Buffer.from would replace
// them with U+FFFD). Node sees the real lone-surrogate string.
const wtf8 = (cp) =>
  Buffer.from([0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f)]);
const loneHigh = String.fromCharCode(0xd800);
const loneLow = String.fromCharCode(0xdfff);
emit(
  "str",
  Buffer.concat([Buffer.from("a", "utf8"), wtf8(0xd800), Buffer.from("b", "utf8")]),
  inspect(`a${loneHigh}b`),
);
emit("str", Buffer.concat([wtf8(0xdfff), Buffer.from("end", "utf8")]), inspect(`${loneLow}end`));

// ── json trees (the layout engine) ───────────────────────────────────
const jsonCases = [
  // scalars through the dyn renderer
  "1",
  "-0",
  '"s"',
  "true",
  "false",
  "null",
  // flat arrays: single-line vs break vs grid grouping
  "[]",
  "[1]",
  "[1,2,3]",
  "[1,2,3,4,5,6]",
  "[1,2,3,4,5,6,7]",
  JSON.stringify(Array.from({ length: 26 }, (_, i) => i)),
  JSON.stringify(Array.from({ length: 100 }, (_, i) => i)),
  JSON.stringify(Array.from({ length: 101 }, (_, i) => i)),
  JSON.stringify(Array.from({ length: 250 }, (_, i) => i * 1000)),
  JSON.stringify(Array.from({ length: 30 }, (_, i) => `str-${i}`)),
  JSON.stringify(Array.from({ length: 8 }, (_, i) => (i % 2 ? i : `s${i}`))),
  JSON.stringify(Array.from({ length: 12 }, () => "0123456789012345678901234567890123456789")),
  // objects: keys, quoting, nesting, depth placeholders
  "{}",
  '{"a":1}',
  '{"a":1,"b":"two","c":true}',
  // NOTE: integer-like keys come FIRST so the checked-dynamic tree's insertion order and
  // JS's integer-keys-first property order agree (the dyn keeps
  // insertion order — the runtime's documented Object.keys stance).
  '{"0":2,"a-b":1,"__proto__":3,"k l":4,"ok_1":5}',
  '{"a":{"b":{"c":{}}}}',
  '{"a":{"b":{"c":{"d":1}}}}',
  '{"a":{"b":{"c":[1,2]}}}',
  '{"a":[[1,[2,[3,[4]]]]]}',
  '{"deep":{"deeper":{"deepest":[1,2,3,4,5,6,7,8,9,10]}}}',
  // the 80-column break edges
  JSON.stringify({ key: "v".repeat(60) }),
  JSON.stringify({ key: "v".repeat(61) }),
  JSON.stringify({ key: "v".repeat(62) }),
  JSON.stringify({ key: "v".repeat(63) }),
  JSON.stringify({ aaaa: 1, bbbb: 2, cccc: 3, dddd: 4, eeee: 5, ffff: 6, gggg: 7, hhhh: 8 }),
  JSON.stringify({
    nested: {
      one: "aaaaaaaaaaaaaaaaaaaa",
      two: "bbbbbbbbbbbbbbbbbbbb",
      three: "cccccccccccccccccccc",
    },
  }),
  // long strings INSIDE composites (indentation-dependent splitting)
  JSON.stringify({ s: "x".repeat(75) + "\ny" }),
  JSON.stringify({
    s: "line one padding padding padding\nline two padding padding padding padding\nline three",
  }),
  JSON.stringify([("long ".repeat(20) + "\n").repeat(2)]),
  // mixed nesting
  '[{"a":1},{"b":2},{"c":3}]',
  '[{"name":"first","values":[1,2,3]},{"name":"second","values":[4,5,6]}]',
  JSON.stringify({ list: Array.from({ length: 40 }, (_, i) => i), tag: "end" }),
  JSON.stringify(Array.from({ length: 9 }, (_, i) => ({ id: i }))),
];
// seeded pseudo-random trees (deterministic — no Math.random)
let seed = 42;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
const randVal = (d) => {
  const r = rnd();
  if (d <= 0 || r < 0.25) {
    const r2 = rnd();
    if (r2 < 0.3) return Math.floor(rnd() * 1000) - 500;
    if (r2 < 0.5) return rnd() > 0.5;
    if (r2 < 0.6) return null;
    return "s".repeat(Math.floor(rnd() * 12)) + (rnd() > 0.7 ? "'q\"" : "");
  }
  if (r < 0.6) return Array.from({ length: Math.floor(rnd() * 9) }, () => randVal(d - 1));
  const o = {};
  const n = Math.floor(rnd() * 6);
  for (let i = 0; i < n; i++) o[rnd() > 0.6 ? `key${i}` : `k-${i}`] = randVal(d - 1);
  return o;
};
for (let i = 0; i < 120; i++) {
  jsonCases.push(JSON.stringify(randVal(4)));
}
// deeper trees: depth placeholders ([Object]/[Array]) + currentDepth math
for (let i = 0; i < 80; i++) {
  jsonCases.push(JSON.stringify(randVal(6)));
}
// unicode in composites: UTF-16 break-length counting + grid widths
jsonCases.push(
  JSON.stringify(Array.from({ length: 12 }, (_, i) => "日本" + i)),
  JSON.stringify(Array.from({ length: 20 }, (_, i) => (i % 3 ? "✓" : "😀").repeat(i % 5))),
  JSON.stringify({ 名前: "テスト", emoji: "😀😀😀", mix: ["ascii", "日本語", 42] }),
  JSON.stringify(Array.from({ length: 9 }, () => "0123456789".repeat(3))),
);
for (const text of jsonCases) {
  emit("json", Buffer.from(text, "utf8"), inspect(JSON.parse(text)));
}

// ── Buffers ──────────────────────────────────────────────────────────
const buffers = [
  [],
  [0],
  [0xab],
  Array.from({ length: 10 }, (_, i) => i),
  Array.from({ length: 49 }, () => 0xff),
  Array.from({ length: 50 }, () => 0xff),
  Array.from({ length: 51 }, () => 0xff),
  Array.from({ length: 52 }, () => 0xff),
  Array.from({ length: 200 }, (_, i) => i % 256),
];
for (const b of buffers) {
  emit("buffer", Buffer.from(b), inspect(Buffer.from(b)));
}

process.stdout.write(lines.join("\n") + "\n");
