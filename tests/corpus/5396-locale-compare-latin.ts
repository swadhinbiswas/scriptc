// localeCompare over Latin-1 and Latin Extended-A text with combining
// diacritics matches Node's root collation: base letters first, then
// accents, then case; precomposed and decomposed forms compare equal. The
// vulgar fractions and the compatibility characters U+00B5, U+0130,
// U+0132, U+0133, U+013F, U+0140 and U+0149 are left out: their case-level
// weights against spelled-out forms differ from Node (a documented limit).
let seed = 977;
function random(): number {
  seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
  return seed / 4294967296;
}
const pool: string[] = [];
for (const ch of "aAeEoOuUcCnNsSzZ09 -.,'") pool.push(ch);
const left = [0xb5, 0xbc, 0xbd, 0xbe, 0x130, 0x132, 0x133, 0x13f, 0x140, 0x149];
for (let c = 0xa0; c <= 0x17f; c++) if (!left.includes(c)) pool.push(String.fromCharCode(c));
for (let c = 0x300; c <= 0x362; c += 2) pool.push(String.fromCharCode(c));
function word(): string {
  const n = Math.floor(random() * 8);
  let w = "";
  for (let i = 0; i < n; i++) w += pool[Math.floor(random() * pool.length)]!;
  return w;
}
function sign(x: number): number {
  return x < 0 ? -1 : x > 0 ? 1 : 0;
}
const fixed: [string, string][] = [
  ["\u00e9", "e\u0301"], ["e\u0301", "\u00e9"], ["\u00e9", "e"], ["e", "\u00e9"], ["\u00e9", "f"], ["\u00c9", "\u00e9"], ["\u00d6", "o"],
  ["\u00df", "ss"], ["\u00e6", "ae"], ["\u00c6", "\u00e6"], ["\u00f8", "o"], ["\u0142", "l"], ["\u00f1", "n"], ["Z\u00fcrich", "Zurich"],
  ["c\u00f4te", "cot\u00e9"], ["cote", "c\u00f4te"], ["\u00c5ngstr\u00f6m", "Angstrom"], ["a\u0323\u0301", "a\u0301\u0323"],
  ["\u00a0", " "], ["\u0150", "\u00d6"], ["\u016f", "u"],
];
console.log(fixed.map(([a, b]) => sign(a.localeCompare(b))).join(","));
let hash = 2166136261;
const counts = [0, 0, 0];
for (let i = 0; i < 40000; i++) {
  const a = word();
  const b = i % 4 === 0 ? a + word() : i % 4 === 1 ? a.toUpperCase() : i % 4 === 2 ? a.normalize("NFD") : word();
  const r = sign(a.localeCompare(b));
  counts[r + 1] = counts[r + 1]! + 1;
  hash = Math.imul(hash ^ (r + 1), 16777619) >>> 0;
}
console.log(counts.join(","), hash.toString(16));
const cities = ["Zürich", "Zurich", "São Paulo", "Sao Paulo", "Montréal", "Montreal", "Kraków", "Ålesund", "Aalborg", "Düsseldorf", "Málaga", "Besançon", "besançon", "Łódź", "Lodz"];
console.log(cities.slice().sort((a, b) => a.localeCompare(b)).join("|"));
