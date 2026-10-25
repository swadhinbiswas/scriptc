// localeCompare treats "l·" and "L·" (with U+00B7 MIDDLE DOT) as one unit,
// equal to U+0140 and U+013F: the dot then orders as an accent, while
// after any other character it is punctuation, as in Node.
function sign(x: number): number {
  return x < 0 ? -1 : x > 0 ? 1 : 0;
}
const dot = "\u00b7";
const pairs: [string, string][] = [
  ["l" + dot, "\u0140"], ["L" + dot, "\u013f"], ["L" + dot + "a", "La"], ["La", "L" + dot + "a"],
  ["l" + dot + "l", "ll"], ["col" + dot + "lecci\u00f3", "collecci\u00f3"], ["a" + dot + "b", "ab"],
  ["l" + dot, "l"], ["l" + dot, "L" + dot], ["\u0140a", "l" + dot + "a"], ["L" + dot + "B", "l" + dot + "b"],
  ["x" + dot, "x"], [dot, ""], ["l" + dot + dot, "l" + dot], ["l" + dot + "\u0301", "l\u0301" + dot],
  ["\u013fB", "L" + dot + "b"], ["para" + dot + "l" + dot + "lel", "paral" + dot + "lel"],
];
console.log(pairs.map(([a, b]) => sign(a.localeCompare(b))).join(","));
const words = ["col" + dot + "lecci\u00f3", "collecci\u00f3", "cola", "col" + dot + "la", "Col" + dot + "lecci\u00f3", "co" + dot + "la", "c\u00f2la", "\u0140", "l", "L", "l" + dot, "L" + dot, "ll", "l" + dot + "l"];
console.log(words.slice().sort((a, b) => a.localeCompare(b)).map((w) => JSON.stringify(w)).join(" "));
