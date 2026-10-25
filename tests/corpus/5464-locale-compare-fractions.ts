// localeCompare over the vulgar fractions U+00BC-U+00BE: each expands to
// its compatibility decomposition through U+2044 FRACTION SLASH and orders
// after it, and after a superscript numerator, at the tertiary level; the
// fraction slash orders after the ASCII slash, as in Node.
function sign(x: number): number {
  return x < 0 ? -1 : x > 0 ? 1 : 0;
}
const slash = "⁄";
const contexts = [(s: string) => s, (s: string) => s + "a", (s: string) => s + "B", (s: string) => "x" + s + "y"];
const groups: string[][] = [
  ["¼", "1" + slash + "4", "1/4", "¹" + slash + "4", "14", "1" + slash + "5", "1" + slash + "3"],
  ["½", "1" + slash + "2", "1/2", "¹" + slash + "²", "1" + slash + "²", "0.5", "½½"],
  ["¾", "3" + slash + "4", "3/4", "³" + slash + "4", "¼", "½", slash, "/"],
];
for (const group of groups) {
  const rows: string[] = [];
  for (const f of contexts) {
    let row = "";
    for (const x of group) for (const y of group) row += sign(f(x).localeCompare(f(y))) + 1;
    rows.push(row);
  }
  console.log(rows.join(" "));
}
const items = ["¾ cup", "½ cup", "1 cup", "¼ cup", "1/2 cup", "1" + slash + "2 cup", "3/4 cup", "2 cups", "¼ tsp", "1/4 tsp"];
console.log(items.slice().sort((x, y) => x.localeCompare(y) || (x < y ? -1 : x > y ? 1 : 0)).map((w) => JSON.stringify(w)).join(" "));
