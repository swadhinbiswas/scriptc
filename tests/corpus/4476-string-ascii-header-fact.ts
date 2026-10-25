// UTF-16 reads (length, charCodeAt, charAt, slice, substring, indexOf,
// lastIndexOf, startsWith/endsWith at a position, padStart) over strings of
// every provenance: literals, concatenations, in-place appends, slices,
// numbers, repeat, join and split pieces. Native strings record a
// proven-ASCII fact in their header; appending a non-ASCII character to a
// uniquely owned ASCII string must drop it, and every index form
// (fractional, -0, negative, NaN, infinite, out of range) keeps Node's
// semantics on both representations, including surrogate halves. (Reads
// never split a surrogate pair into a string; 4991 covers that.)

function codes(s: string): string {
  const out: number[] = [];
  for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i));
  return out.join(",");
}

function probe(label: string, s: string): void {
  const idx = [0, -0, 0.5, 1.9999, -0.5, -1, NaN, Infinity, -Infinity, s.length - 1, s.length, 2 ** 32];
  const units: string[] = [];
  for (const i of idx) units.push(String(s.charCodeAt(i)));
  const chars: string[] = [];
  for (const i of idx) chars.push(JSON.stringify(s.charAt(i)));
  console.log(label, s.length, units.join(" "), chars.join(" "));
  console.log(
    "  slice",
    JSON.stringify(s.slice(1, -1)),
    JSON.stringify(s.slice(-3)),
    JSON.stringify(s.substring(5, 2)),
    JSON.stringify(s.slice(2, 2)),
  );
  console.log(
    "  search",
    s.indexOf("b"),
    s.indexOf("b", 3),
    s.lastIndexOf("b"),
    s.indexOf(""),
    s.indexOf("", 99),
    s.startsWith("b", 1),
    s.endsWith("b", 2),
  );
  console.log("  pad", JSON.stringify(s.padStart(s.length + 3, "-")), JSON.stringify(s.padEnd(s.length + 2, "\u00e9")));
}

// Literals: ASCII, BMP and astral.
probe("lit-ascii", "abcabc");
probe("lit-bmp", "ab\u00e9cb\u00e9");
probe("lit-astral", "ab\u{1F600}cbd");

// Concatenations of every pairing.
const n = 7;
const left = "ab" + String(n);
const right = "\u00e9b" + String(n);
probe("cat-aa", left + "cb");
probe("cat-an", left + right);
probe("cat-na", right + left);
probe("cat-astral", left + "\u{1F600}b");

// Uniquely owned strings appended in place after an ASCII read.
let grow = "";
for (let i = 0; i < 6; i++) grow += String.fromCharCode(97 + i);
console.log("grow", grow.length, grow.charCodeAt(3), codes(grow));
grow += "\u00e9";
console.log("grow+bmp", grow.length, grow.charCodeAt(6), grow.charCodeAt(7), codes(grow));
grow += "\u{1F600}b";
console.log("grow+astral", grow.length, grow.charCodeAt(7), grow.charCodeAt(8), grow.charCodeAt(9), codes(grow));
probe("grow", grow);

let chain = "x";
for (let i = 0; i < 40; i++) {
  chain += i % 13 === 12 ? "\u03a9" : String(i % 10);
  if (chain.charCodeAt(chain.length - 1) > 127) console.log("non-ascii at", chain.length - 1, chain.charCodeAt(chain.length - 1));
}
console.log("chain", chain.length, chain.indexOf("\u03a9"), chain.lastIndexOf("\u03a9"), chain.slice(10, 16));

// Template literals mixing numbers and strings.
const id = 42;
const key = `${id},${id + 1}|${right}`;
probe("template", key);

// Slices: ASCII slices of non-ASCII strings and the reverse.
const mixed = "\u00e9abcb\u00e9xyz\u{1F600}!";
const inner = mixed.slice(1, 5);
probe("slice-ascii-of-mixed", inner);
probe("slice-mixed", mixed.slice(0, 7));
probe("substring-astral", mixed.substring(7, 13));
console.log("astral halves", mixed.charCodeAt(9), mixed.charCodeAt(10), mixed.slice(9, 11) === "\u{1F600}");

// Numbers, repeat, join, split pieces.
probe("number", String(-1234.5e-7) + "b");
probe("repeat", "ab".repeat(4));
probe("repeat-bmp", "a\u00e9".repeat(3));
probe("join", ["ab", "cb", "d"].join(""));
probe("join-bmp", ["ab", "\u00e9", "cb"].join("-"));
const pieces = "abcdefgh,b\u00e9cdefgh,abcdefgb".split(",");
for (const p of pieces) console.log("piece", p.length, p.charCodeAt(1), p.charCodeAt(p.length - 1), codes(p));

// Builder-made strings (join, JSON.stringify) are proven ASCII by their
// first read, then appended in place with non-ASCII text and read again.
let built = ["ab", "cd", "ef", String(n)].join("");
console.log("built", built.length, built.charCodeAt(4), built.indexOf("7"), built.slice(2, 5));
built += "\u00e9" + built;
console.log("built+bmp", built.length, built.charCodeAt(7), built.charCodeAt(8), built.lastIndexOf("e"), built.slice(5, 9));
let json = JSON.stringify({ k: [1, 2, 3], s: "x" });
console.log("json", json.length, json.charCodeAt(2), json.indexOf("s"));
json += "\u{1F600}";
console.log("json+astral", json.length, json.charCodeAt(json.length - 2), json.charCodeAt(json.length - 1), json.slice(-4));

// Interleaved reads of several receivers (index cache residency).
const a1 = "alpha\u00e9" + String(n);
const a2 = "beta" + String(n);
const a3 = "\u{1F600}gamma";
let mix = 0;
for (let i = 0; i < 8; i++) {
  mix = mix * 31 + a1.charCodeAt(i % a1.length) + a2.charCodeAt(i % a2.length) * 3 + a3.charCodeAt(i % a3.length) * 7;
  mix %= 1000003;
}
console.log("interleaved", mix);
