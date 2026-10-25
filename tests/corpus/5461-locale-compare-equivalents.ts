// localeCompare over canonically equivalent and near-equivalent spellings:
// U+0130 equals I + U+0307, precomposed letters equal their decompositions
// in every context, and ligatures order against their spelled-out letters
// by case (ij < iJ < ĳ < Ij < IJ < Ĳ), as in Node.
function sign(x: number): number {
  return x < 0 ? -1 : x > 0 ? 1 : 0;
}
const contexts = [(s: string) => s, (s: string) => s + "a", (s: string) => s + "B", (s: string) => "x" + s + "y"];
const groups: string[][] = [
  ["\u0130", "I\u0307", "i\u0307", "I", "i", "\u0131"],
  ["\u0133", "ij", "iJ", "Ij", "IJ", "\u0132"],
  ["\u00e6", "\u00c6", "ae", "AE", "a\u00e6"],
  ["\u0153", "\u0152", "oe", "OE"],
  ["\u00df", "ss", "sS", "Ss", "SS"],
  ["\u00e1", "a\u0301", "\u00c1", "A\u0301", "a"],
  ["\u00c5", "A\u030a", "a\u030a", "\u00e5"],
  ["\u00aa", "a", "A", "\u00ba", "o"],
];
for (const group of groups) {
  const rows: string[] = [];
  for (const f of contexts) {
    let row = "";
    for (const a of group) for (const b of group) row += sign(f(a).localeCompare(f(b))) + 1;
    rows.push(row);
  }
  console.log(rows.join(" "));
}
const all = groups.flat();
console.log(all.slice().sort((a, b) => a.localeCompare(b) || (a < b ? -1 : a > b ? 1 : 0)).map((w) => JSON.stringify(w)).join(" "));
