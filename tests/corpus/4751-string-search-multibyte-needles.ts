// String searches with needles of two or more bytes, in haystacks below and
// above the 256-byte threshold where the native search changes strategy:
// matches at every offset around the eight-byte steps, repeated first bytes,
// near misses, needles at the very end, and non-ASCII needles and haystacks.

function report(label: string, hay: string, needle: string): void {
  const all: number[] = [];
  for (let at = hay.indexOf(needle); at >= 0; at = hay.indexOf(needle, at + 1)) all.push(at);
  console.log(
    `${label}: len=${hay.length} first=${hay.indexOf(needle)} last=${hay.lastIndexOf(needle)} ` +
      `includes=${hay.includes(needle)} count=${all.length} at=[${all.slice(0, 12).join(",")}] ` +
      `parts=${hay.split(needle).length}`,
  );
}

// Paths: '/' repeats the first byte of every relative-segment needle.
const paths = [
  "/vercel/sandbox/bench/repos/trpc/node_modules/.pnpm/@types+node@22.0.0/node_modules/@types/node/index.d.ts",
  "/a/b//c/./d/../e",
  "./relative/path",
  "../up/one",
  "no/slashes/at/the/end/",
  "trailing/.",
  "trailing/..",
  "//leading",
  "a/./b/./c/./d",
  "",
  "/",
  "//",
];
for (const p of paths) {
  for (const needle of ["//", "/./", "/../", "/.", "node_modules", "d.ts"]) report(JSON.stringify(p) + " " + needle, p, needle);
}

// Every match offset relative to the eight-byte steps, short and long haystacks.
for (const size of [15, 16, 17, 31, 64, 255, 256, 257, 300, 1000]) {
  for (let at = 0; at < 20; at++) {
    const pos = Math.max(0, size - 2 - at);
    const hay = "x".repeat(pos) + "ab" + "y".repeat(Math.max(0, size - pos - 2));
    const found = hay.indexOf("ab");
    if (found !== pos) console.log(`MISMATCH size=${size} pos=${pos} found=${found}`);
  }
  // Repeated first byte with the second byte only at the end.
  const repeated = "a".repeat(size) + "b";
  report(`repeated a x${size}`, repeated, "ab");
  report(`repeated a x${size} aab`, repeated, "aab");
  // Near misses: the first two bytes match, the rest does not, until the end.
  const near = "abX".repeat(Math.ceil(size / 3)) + "abc";
  report(`near x${size}`, near, "abc");
  report(`near x${size} missing`, near, "abd");
  // A zero-byte-test false positive pattern: 0x01 bytes after a match of one half.
  const ctl = "\u0001a\u0001b".repeat(Math.ceil(size / 4)) + "ab";
  report(`control x${size}`, ctl, "ab");
}

// Non-ASCII haystacks and needles (multi-byte UTF-8, astral characters).
const text = "naïve café — 日本語 tëxt 😀 end; 日本 again, café — fin";
for (const needle of ["café", "日本", "日本語", "😀 e", "— ", "ë", "fin", "nope", "é —"]) report(needle, text, needle);
const longText = (text + " / ").repeat(12);
for (const needle of ["café", "日本語", "😀", " / n", "fin / naïve"]) report("long " + needle, longText, needle);

// Positions passed to indexOf on both sides of the threshold.
const mixed = "ab".repeat(200);
console.log(mixed.indexOf("ab", 255), mixed.indexOf("ab", 256), mixed.indexOf("ba", 397), mixed.indexOf("ab", 399));
console.log(mixed.slice(0, 40).indexOf("bab", 3), mixed.lastIndexOf("abab"), mixed.includes("aa"));
