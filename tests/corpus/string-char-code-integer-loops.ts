// charCodeAt at counted-loop counters and other proven integers: in-range
// reads, negative and past-the-end indices, non-ASCII and surrogate text,
// and counters near the 2^31 and 2^53 bounds. (4990-lone-surrogates covers
// lone surrogates.)
const texts = ["", "a", "plain ascii text", "caf\u00e9 cr\u00e8me", "emoji \ud83d\ude00 pair", "\u4e2d\u6587\u5b57"];

function codes(s: string): string {
  let out = "";
  for (let i = 0; i < s.length; i++) out += s.charCodeAt(i) + ",";
  return out;
}
function inclusive(s: string): string {
  let out = "";
  for (let i = 0; i <= s.length; i++) out += s.charCodeAt(i) + ",";
  return out;
}
function neighbours(s: string): string {
  let out = "";
  for (let i = 0; i < s.length; i++) out += `${s.charCodeAt(i - 1)}/${s.charCodeAt(i + 1)}/${s.charCodeAt(i * 2)},`;
  return out;
}
function backwards(s: string): string {
  let out = "";
  for (let i = s.length - 1; i >= -2; i--) out += s.charCodeAt(i) + ",";
  return out;
}
function hash(s: string): number {
  let h = 0x811c9dc5 | 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
}
for (const s of texts) {
  console.log(JSON.stringify(s), s.length, codes(s), inclusive(s), neighbours(s), backwards(s), hash(s));
}

// A counter that starts negative or at -0.
function fromStart(s: string, start: number): string {
  let out = "";
  for (let i = start; i < 3; i++) out += `${Object.is(i, -0) ? "-0" : i}:${s.charCodeAt(i)},`;
  return out;
}
for (const start of [-3, -0, 0, 1]) console.log("start", start, fromStart("xyz", start), fromStart("", start));

// Counters far beyond any string length.
function wide(s: string, start: number): string {
  let out = "";
  let steps = 0;
  for (let i = start; i < start + 4; i++) {
    out += `${i}:${s.charCodeAt(i)}:${s.charCodeAt(i - start)},`;
    if (++steps === 4) break;
  }
  return out;
}
for (const start of [2147483646, 4294967294, 9007199254740989]) console.log("wide", wide("abcd", start));

// Bounds derived from indexOf and length.
function afterSlash(path: string): number {
  let sum = 0;
  for (let i = path.indexOf("/") + 1; i < path.length; i++) sum += path.charCodeAt(i);
  return sum;
}
function countDots(path: string): number {
  const n = path.length;
  let dots = 0;
  for (let i = 0; i < n; i++) if (path.charCodeAt(i) === 46) dots++;
  return dots;
}
for (const path of ["a/b.c", "/x/./y/../z", "no-slash", "", "\u00e9/\u00e8.\u00ea"]) {
  console.log("path", JSON.stringify(path), afterSlash(path), countDots(path), path.indexOf("."), path.length);
}

// The receiver changes inside the loop.
function changing(seed: string): string {
  let s = seed;
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += s.charCodeAt(i) + ",";
    s = i % 2 === 0 ? s + "\u00df" : s.slice(1);
  }
  return out;
}
console.log("changing", changing("ab"), changing(""));
