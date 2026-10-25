// Mostly ASCII strings with rare non-ASCII characters (2-, 3- and 4-byte
// UTF-8, the last a surrogate pair), read the way a scanner reads a source
// text: forward substrings and character codes, searches whose results are
// UTF-16 offsets, backward reads and random jumps. Short and long strings
// (the native index keeps them in different caches) of several shapes.

const words = ["alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta", "theta", "iota", "kappa"];
const rare = ["\u00e9", "\u20ac", "\ud83d\ude00", "\u00df\u00e4", "\u4e2d"];

let seed = 12345;
function rand(n: number): number {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return (seed >>> 8) % n;
}

function makeText(lines: number, rareEvery: number): string {
  const out: string[] = [];
  for (let i = 0; i < lines; i++) {
    let line = "";
    const count = 3 + rand(8);
    for (let j = 0; j < count; j++) {
      if (j > 0) line += rand(5) === 0 ? ", " : " ";
      line += words[rand(words.length)]!;
      if (rareEvery > 0 && rand(rareEvery) === 0) line += rare[rand(rare.length)]!;
    }
    out.push(line);
  }
  return out.join("\n");
}

function fold(hash: number, s: string): number {
  for (let i = 0; i < s.length; i++) hash = (Math.imul(hash, 31) + s.charCodeAt(i)) | 0;
  return (Math.imul(hash, 17) + s.length) | 0;
}

function isWordUnit(c: number): boolean {
  return (c >= 97 && c <= 122) || c > 127;
}

// Forward: extract every word with substring, as a scanner takes token values.
function forward(text: string): string {
  let hash = 0;
  let count = 0;
  let pos = 0;
  while (pos < text.length) {
    const c = text.charCodeAt(pos);
    if (!isWordUnit(c)) {
      pos++;
      continue;
    }
    const start = pos;
    while (pos < text.length && isWordUnit(text.charCodeAt(pos))) pos++;
    hash = fold(hash, text.substring(start, pos));
    count++;
  }
  return `words=${count} hash=${hash}`;
}

// Searches: line breaks and a word, with offsets fed back into slices.
function searches(text: string): string {
  let hash = 0;
  let lines = 0;
  for (let i = text.indexOf("\n"); i >= 0; i = text.indexOf("\n", i + 1)) {
    lines++;
    // Keep surrogate pairs whole in these slices.
    let from = Math.max(0, i - 6);
    const unit = text.charCodeAt(from);
    if (unit >= 0xdc00 && unit <= 0xdfff) from--;
    hash = fold(hash, text.slice(from, i));
  }
  let found = 0;
  for (let i = text.indexOf("theta"); i >= 0; i = text.indexOf("theta", i + 5)) {
    found++;
    hash = (hash + i) | 0;
  }
  const last = text.lastIndexOf("kappa");
  return `lines=${lines} theta=${found} lastKappa=${last} hash=${hash}`;
}

// Backward reads and random jumps; a position inside a surrogate pair moves to its start.
function jumps(text: string): string {
  let hash = 0;
  for (let i = text.length - 1; i >= 0; i -= 7) hash = (Math.imul(hash, 3) + text.charCodeAt(i)) | 0;
  for (let k = 0; k < 400; k++) {
    let a = rand(text.length);
    const lowA = text.charCodeAt(a);
    if (lowA >= 0xdc00 && lowA <= 0xdfff) a--;
    let b = Math.min(text.length, a + 1 + rand(40));
    const lowB = text.charCodeAt(b);
    if (b < text.length && lowB >= 0xdc00 && lowB <= 0xdfff) b++;
    hash = fold(hash, text.substring(a, b));
  }
  return `hash=${hash}`;
}

const shapes: [string, number, number][] = [
  ["short ascii", 20, 0],
  ["short mixed", 40, 6],
  ["medium mixed", 900, 40],
  ["long sparse", 9000, 400],
  ["long dense", 6000, 3],
  ["long ascii", 7000, 0],
];
for (const [name, lines, rareEvery] of shapes) {
  const text = makeText(lines, rareEvery);
  console.log(name, `length=${text.length}`, forward(text), searches(text), jumps(text));
}

// A long ASCII prefix before the first non-ASCII character, read from both ends.
const prefix = "x".repeat(70000) + "\u00e9" + "y".repeat(5000) + "\ud83d\ude00" + "z".repeat(100);
console.log(
  prefix.length,
  prefix.indexOf("\u00e9"),
  prefix.indexOf("y"),
  prefix.indexOf("z"),
  prefix.substring(69998, 70003),
  prefix.substring(75000, 75004),
  prefix.charCodeAt(75001),
  prefix.charCodeAt(75002),
  prefix.lastIndexOf("x"),
);
