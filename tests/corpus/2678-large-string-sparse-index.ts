// Large mixed-Unicode indexed-string regression. The output is compact and
// deterministic; the runtime white-box test owns the complexity bound while
// this corpus pins native semantics against Node.
const piece = "aé😀é"; // UTF-16 units: a, é, high/low 😀, e, combining mark
const text = piece.repeat(12000);
const positions = [0, 1, 2, 3, 4, 5, 6, 31111, 52799, text.length - 6];

let codes = 0;
let spans = "";
for (const p of positions) {
  codes = (codes * 131 + text.charCodeAt(p)) % 1000000007;
  spans += text.slice(p, p + 3).length + ",";
  spans += text.substring(p + 1, p + 4).length + ";";
}

const middle = Math.floor(text.length / 2 / 6) * 6;
console.log(text.length, codes, spans);
console.log(
  text.charCodeAt(middle + 2),
  text.charCodeAt(middle + 3),
  text.indexOf("é😀", middle),
  text.includes("😀e", middle + 1),
  text.lastIndexOf("😀"),
);
let iter = 0;
for (const ch of text.slice(middle, middle + 12)) iter = iter * 17 + ch.length;
console.log(iter, text.slice(-6).length, text.substring(2, 4).length);

// Local scans cross ASCII windows, word boundaries and astral pairs in both
// directions. Interleave distant reads and positioned searches on the same
// receiver so no single navigation path can mask stale cache coordinates.
const row = "abcdefghijklmnopqrstuvwxyz".repeat(11) + "é中😀🧭\0\n";
let document = row.repeat(300);
let checksum = 0;
for (let i = 0; i < document.length; i++) {
  checksum = (checksum + document.charCodeAt(i) * (i % 17 + 1)) % 1000000007;
}
for (let i = document.length - 1; i >= 0; i--) {
  checksum = (checksum + document.charCodeAt(i) * (i % 13 + 1)) % 1000000007;
}
let state = 37;
let spansLength = 0;
for (let i = 0; i < 128; i++) {
  state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
  const at = state % document.length;
  const from = document.lastIndexOf("\n", at - 1) + 1;
  const to = document.indexOf("\n", at);
  const selected = document.substring(from, to);
  const prefix = document.slice(from, from + 26);
  const end = document.indexOf("é中😀🧭", from) + 6;
  spansLength += selected.length;
  if (!document.startsWith(prefix, from) || !document.endsWith("é中😀🧭", end)) {
    console.log("position mismatch", i);
  }
  checksum = (checksum + document.charCodeAt(at)) % 1000000007;
}
console.log(checksum, spansLength);

// Appending preserves old windows and anchors, while the new suffix still
// needs indexing. Aliases retain the old value across the append.
const original = document;
document += "new😀suffix";
console.log(original.length, document.length, document.slice(-11));
console.log(document.indexOf("new😀", original.length), document.endsWith("😀suffix"));
