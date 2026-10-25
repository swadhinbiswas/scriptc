class Search {
  pattern: RegExp;
  text: string;
  replacement: string;
  constructor() {
    this.pattern = /a/g;
    this.text = "ab".repeat(3);
    this.replacement = "x".repeat(2);
  }
}
function scan(search: Search): void {
  console.log(search.pattern.test(search.text), search.pattern.lastIndex);
  console.log(search.pattern.test(search.text), search.pattern.lastIndex);
  console.log(search.pattern.source, search.pattern.flags, search.pattern.toString());
  console.log(search.text.search(search.pattern), search.pattern.lastIndex);
  console.log(search.text.replace(search.pattern, search.replacement));
  console.log(search.text.split(search.pattern, 3).join("|"));
  console.log(search.text.match(search.pattern)?.join("|"));
}
function swapText(search: Search): string { search.text = "changed"; return "z"; }
function swapPattern(search: Search): string { search.pattern = /x/g; return "a"; }
function clear(search: Search): string {
  search.text = "cleared";
  search.pattern = /z/g;
  throw new Error("replacement failed");
}
function work(): void {
  const search = new Search();
  scan(search);
  console.log(search.text.replace(search.pattern, swapText(search)), search.text);
  console.log(search.pattern.test(swapPattern(search)), search.pattern.lastIndex);
  const match = "ab".repeat(2).match(search.pattern);
  console.log(match === null);
  try { console.log(search.text.replace(search.pattern, clear(search))); }
  catch (error) { console.log((error as Error).message); }
  console.log(search.pattern.test(search.text), search.text);
  const all = "a1a2".replaceAll(/a/g, "b");
  console.log(all);
  for (const found of "a1a2".matchAll(/a\d/g)) console.log(found[0]);
}
work();
console.log(new RegExp("", "mi").toString());
console.log(new RegExp("a/b\n", "yg").toString());
console.log(String(/a\/b/g) === /a\/b/g.toString());

function sameState(pattern: string, flags: string, text: string, start: number): void {
  const predicate = new RegExp(pattern, flags);
  const capture = new RegExp(pattern, flags);
  predicate.lastIndex = start;
  capture.lastIndex = start;
  for (let i = 0; i < 3; i++) {
    console.log(predicate.test(text), capture.exec(text) !== null,
      Object.is(predicate.lastIndex, capture.lastIndex), predicate.lastIndex);
  }
  console.log(predicate.flags, predicate.toString());
}
sameState("a", "g", "aba", -2);
sameState("a", "y", "ba", 1.9);
sameState("a", "", "aba", Infinity);
sameState("a", "g", "aba", Infinity);
sameState("a", "g", "aba", NaN);
sameState("(?:)", "g", "", -0);
sameState(".", "gu", "a😀é", 1);
sameState(".", "g", "😀", 0);
sameState("(a)?(b)\\2", "ig", "abbA", 0);
sameState("(?<=a)b", "g", "abcb", 0);
sameState("(a?)".repeat(40), "gy", "a".repeat(40), 0);
sameState("é", "g", "a".repeat(31) + "é", 0);
sameState("é", "g", "a".repeat(32) + "é", 0);
sameState("z", "u", "a".repeat(129), 0);
sameState("a+", "g", "a".repeat(256), 0);
sameState("a+", "g", "a".repeat(257), 0);
