// Generates string-method test cases with Node as the oracle.
// Each line: <op>\t<input-hex>\t<args>\t<expected-hex>
//
//   node gen-string-cases.mjs > string-cases.txt
//
// All strings are hex-encoded bytes of scriptc's string storage ("-" =
// empty) so the file is unambiguous: UTF-8, with each lone surrogate (charAt
// on half an astral pair, slice boundaries splitting a pair) as its 3-byte
// WTF-8 encoding. Numeric args use String(x) (strtod-parseable, including
// "NaN"/"Infinity"/"-Infinity"); numeric/boolean expected values are the
// hex of String(result), which the C side reproduces via scr_f64_to_str
// (itself fuzz-verified against Node) or "true"/"false".
import { stdout } from "node:process";

const hex = (str) => {
  const parts = [];
  for (const ch of str) {
    const unit = ch.charCodeAt(0);
    parts.push(
      ch.length === 1 && unit >= 0xd800 && unit <= 0xdfff
        ? Buffer.from([0xed, 0x80 | ((unit >> 6) & 0x3f), 0x80 | (unit & 0x3f)])
        : Buffer.from(ch, "utf8"),
    );
  }
  const b = Buffer.concat(parts);
  return b.length ? b.toString("hex") : "-";
};
const num = (x) => String(x); // NaN / Infinity / -Infinity / -0 -> "0": all fine

const strings = [
  // ASCII
  "",
  "a",
  "Z",
  "abc",
  "abab",
  "ababab",
  "aXbXc",
  "hello world",
  "Hello, World! 123",
  "abc\0def", // embedded NUL (valid UTF-8; len-based, not strlen-based)
  // whitespace / trim material
  " ",
  "  padded  ",
  "\t\r\n x \n\r\t",
  // the full JS WhiteSpace + LineTerminator set around a payload
  "\t\n\v\f\r          　\uFEFFw s　\uFEFF \t",
  "\u200B", // ZERO WIDTH SPACE is NOT JS whitespace — must survive trim
  " 　\u{1F600}　 ", // astral payload inside whitespace
  // Latin-1 / 2-byte UTF-8
  "é",
  "café",
  "naïve über",
  // 3-byte UTF-8: CJK and BMP edges
  "你好世界",
  "日本語テスト",
  "你好world",
  "�", // pre-existing replacement char (distinct from divergence output!)
  "￿", // private use + max BMP
  "a b c", // line separators mid-string
  // astral (4-byte UTF-8, surrogate pairs in JS)
  "\u{1F600}",
  "a\u{1F600}b",
  "\u{1F600}\u{1F601}\u{1F602}",
  "x\u{1F600}\u{1F600}y",
  "\u{10000}",
  "\u{10FFFF}",
  "a\u{10FFFF}",
  "\u{1F1FA}\u{1F1F8}", // regional indicators (flag)
  // combining marks
  "é",
  "café",
  "à́̂b",
  // mixed everything
  "mixed é中\u{1F600}é end",
  "\u{1F600} café 世界 é!",
];

const lines = new Set();
function emit(op, input, args, expected) {
  lines.add(`${op}\t${hex(input)}\t${args}\t${expected}`);
}

// Pin conversion and early exhaustion separately from the broad method
// oracle: limits can stop between the surrogate halves of an astral unit.
for (const [input, separator] of [
  ["", ","],
  [",a,,b,", ","],
  ["ababa", "aba"],
  ["a\0b\0", "\0"],
  ["a😀b", ""],
]) {
  for (const limit of [0, 1, 2, 3, 7, -1, 1.9, NaN, Infinity, 4294967296, 4294967297]) {
    const pieces = input.split(separator, limit);
    emit(
      "splitLimit",
      input,
      `${hex(separator)},${num(limit)}`,
      hex(`${pieces.length}:${pieces.join("\x01")}`),
    );
  }
}

for (const s of strings) {
  const L = s.length;
  const idxs = [
    ...new Set([
      NaN,
      -Infinity,
      Infinity,
      -L - 5,
      -L - 1,
      -L,
      -L + 1,
      -3,
      -2,
      -1,
      -0.5,
      0,
      0.5,
      1,
      1.5,
      2,
      3,
      Math.floor(L / 2),
      L - 2,
      L - 1,
      L - 0.5,
      L,
      L + 1,
      L + 5,
    ]),
  ];

  emit("len", s, "-", hex(String(L)));
  emit("trim", s, "-", hex(s.trim()));
  emit("trimStart", s, "-", hex(s.trimStart()));
  emit("trimEnd", s, "-", hex(s.trimEnd()));

  // split(separator): expected is `${count}:${pieces.join("\x01")}` so
  // empty results ([] vs [""]) stay distinguishable; \x01 appears in no
  // corpus string. Lone-surrogate pieces (empty separator over astral
  // chars) hex as their WTF-8 bytes.
  for (const sep of new Set([
    "",
    ",",
    "a",
    "X",
    " ",
    "é",
    "世",
    "\u{1F600}",
    s.slice(0, 1),
    s.slice(1, 3),
    s,
  ])) {
    if (!sep.isWellFormed()) continue;
    const pieces = s.split(sep);
    emit("split", s, hex(sep), hex(`${pieces.length}:${pieces.join("\x01")}`));
  }

  // padStart/padEnd: targets around the length, fills of 1..n units
  // including astral fills the truncation can split (the lone high
  // surrogate JS keeps).
  for (const target of [NaN, -3, 0, 1, L - 1, L, L + 1, L + 3, L + 7, L + 0.5, 2 * L + 3])
    for (const fill of ["", " ", "0", "ab", "xyz", "é", "\u{1F600}", "a\u{1F600}"]) {
      emit("padStart", s, `${num(target)},${hex(fill)}`, hex(s.padStart(target, fill)));
      emit("padEnd", s, `${num(target)},${hex(fill)}`, hex(s.padEnd(target, fill)));
    }

  for (const i of idxs) {
    emit("charCodeAt", s, num(i), hex(String(s.charCodeAt(i))));
    emit("charAt", s, num(i), hex(s.charAt(i)));
  }

  for (const a of idxs)
    for (const b of idxs) emit("slice", s, `${num(a)},${num(b)}`, hex(s.slice(a, b)));

  // needles: derived substrings (only well-formed ones — a needle with a
  // lone surrogate cannot exist as a scriptc string) plus fixed probes
  const needles = [
    ...new Set(
      [
        "",
        "a",
        "b",
        "X",
        "z!",
        s,
        s + " ",
        s.slice(0, 1),
        s.slice(0, 2),
        s.slice(1, 3),
        s.slice(-1),
        s.slice(-2),
        s.slice(2, -1),
        "\u{1F600}",
        "世",
        "é",
        "é",
        "́",
        " ",
      ].filter((n) => n.isWellFormed()),
    ),
  ];
  const fromIdxs = [
    ...new Set([
      NaN,
      -Infinity,
      Infinity,
      -5,
      -1,
      0,
      1,
      1.5,
      2,
      Math.floor(L / 2),
      L - 1,
      L,
      L + 5,
    ]),
  ];
  for (const n of needles) {
    emit("includes", s, hex(n), hex(String(s.includes(n))));
    emit("startsWith", s, hex(n), hex(String(s.startsWith(n))));
    emit("endsWith", s, hex(n), hex(String(s.endsWith(n))));
    emit("lastIndexOf", s, hex(n), hex(String(s.lastIndexOf(n))));
    for (const f of fromIdxs)
      emit("indexOf", s, `${hex(n)},${num(f)}`, hex(String(s.indexOf(n, f))));
  }

  // valid repeat counts only; count < 0 / Infinity -> RangeError -> abort,
  // covered by the crash test in string.test.ts
  for (const c of [0, 1, 2, 3, 7, 2.9, 0.5, -0.5, NaN]) emit("repeat", s, num(c), hex(s.repeat(c)));
}

// parseInt(s, radix): args = String(radix) (strtod-parseable), expected =
// hex of String(result) — the C side formats through scr_f64_to_str,
// itself fuzz-verified against Node, so correctly-rounded bignum results
// compare exactly. String(-0) is "0" on both sides; the -0 SIGN is pinned
// by the differential corpus instead.
const parseIntInputs = [
  "",
  " ",
  "0",
  "-0",
  "+0",
  "42",
  "  42  ",
  "\t\n-17",
  "+99",
  "3.9",
  "1e3",
  "0x1F",
  "0X1f",
  "-0x20",
  "  +0xAb",
  "0x",
  "0xG",
  "08",
  "079",
  "ff",
  "FF",
  "zz",
  "z!",
  "101",
  "777",
  "12abc",
  "abc12",
  "-",
  "+",
  " - 1",
  "١٢٣",
  "Infinity",
  "NaN",
  "9007199254740993",
  "18446744073709551617",
  "123456789012345678901234567890",
  "9".repeat(40),
  "1" + "0".repeat(308),
  "1" + "0".repeat(309),
  "-1" + "0".repeat(400),
  "0".repeat(50) + "7",
  "deadbeefdeadbeefdeadbeefdeadbeef",
  "7".repeat(30),
  "1".repeat(80),
  "  1 ",
  "　42",
  "42\0",
  "1_000",
];
const radices = [
  undefined,
  0,
  2,
  8,
  10,
  16,
  36,
  1,
  37,
  -1,
  16.9,
  NaN,
  Infinity,
  -Infinity,
  2.5,
  4294967312,
  -4294967280,
  35,
];
// parseInt cases whose Node answer depends on the architecture, keyed by
// input and radix argument. For radixes other than 2, 4, 8, 10, 16 and 32, V8
// folds each 32-bit digit chunk with `value * multiplier + part`; Node's
// arm64 builds fuse that multiply-add into one rounding and its x64 builds
// round twice. Each case is written once per architecture with the listed
// answers, so the file is the same whichever machine generates it, and the
// answer for this machine's architecture is checked against Node here.
const ARCH_PARSEINT = new Map([
  ["9007199254740993\t36", { arm64: "1.9896986116031812e+24", x64: "1.9896986116031807e+24" }],
  [
    "123456789012345678901234567890\t36",
    { arm64: "1.436287679432363e+45", x64: "1.4362876794323633e+45" },
  ],
]);
const ownArch = process.arch === "arm64" ? "arm64" : "x64";
const archCases = new Set();
for (const s of parseIntInputs)
  for (const r of radices) {
    const args = r === undefined ? "0" : num(r);
    const answer = String(parseInt(s, r));
    const arch = ARCH_PARSEINT.get(`${s}\t${args}`);
    if (arch === undefined) {
      emit("parseInt", s, args, hex(answer));
      continue;
    }
    if (answer !== arch[ownArch]) {
      throw new Error(
        `parseInt(${JSON.stringify(s)}, ${args}) is ${answer} on ${process.arch}; ARCH_PARSEINT lists ${arch[ownArch]}`,
      );
    }
    archCases.add(`${s}\t${args}`);
    emit("parseInt.arm64", s, args, hex(arch.arm64));
    emit("parseInt.x64", s, args, hex(arch.x64));
  }
if (archCases.size !== ARCH_PARSEINT.size) {
  throw new Error("ARCH_PARSEINT lists a case that parseIntInputs and radices do not generate");
}

stdout.write([...lines].join("\n") + "\n");
