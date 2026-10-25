// localeCompare over ASCII text matches Node's root collation: letters
// before case ("a" < "B"), digits and punctuation by their collation
// weights, prefixes before longer strings, and case as the last level.
let seed = 4111;
function random(): number {
  seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
  return seed / 4294967296;
}
const alphabet = "aAbBcCzZ019 -_.,;:!?'\"()[]{}@#$%&*+/<=>\\^`|~\t\n";
function word(): string {
  const n = Math.floor(random() * 10);
  let w = "";
  for (let i = 0; i < n; i++) w += alphabet[Math.floor(random() * alphabet.length)]!;
  return w;
}
function sign(x: number): number {
  return x < 0 ? -1 : x > 0 ? 1 : 0;
}
const fixed: [string, string][] = [
  ["a", "B"], ["B", "a"], ["a", "A"], ["A", "a"], ["ab", "aB"], ["", "a"], ["a", ""], ["", ""],
  ["abc", "abc"], ["abc", "abcd"], ["item10", "item9"], ["a-b", "ab"], ["a b", "ab"], ["a_b", "a-b"],
  ["Zebra", "apple"], ["résumé", "resume"], ["x", "X"], ["!", "?"], ["1", "a"], ["\t", " "],
];
console.log(fixed.map(([a, b]) => sign(a.localeCompare(b))).join(","));
let hash = 2166136261;
const counts = [0, 0, 0];
for (let i = 0; i < 40000; i++) {
  const a = word();
  const b = i % 3 === 0 ? a + word() : i % 3 === 1 ? a.toUpperCase() : word();
  const r = sign(a.localeCompare(b));
  counts[r + 1] = counts[r + 1]! + 1;
  hash = Math.imul(hash ^ (r + 1), 16777619) >>> 0;
}
console.log(counts.join(","), hash.toString(16));
const names = ["bo Lee", "ana smith", "Ana Smith", "ana-smith", "anA smith", "ana  smith", "Bo lee", "cy", "Cy", "cy2", "cy10"];
console.log(names.slice().sort((a, b) => a.localeCompare(b)).join("|"));
