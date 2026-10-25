// localeCompare over the combining Latin small letters U+0363-U+036F: each
// is its letter's primary, between the lower- and upper-case letter at the
// tertiary level, and reorders with diacritics by combining class (after a
// dot below, in place against an acute), as in Node.
function sign(x: number): number {
  return x < 0 ? -1 : x > 0 ? 1 : 0;
}
const letters = "aeioucdhmrtvx";
const contexts = [(s: string) => s, (s: string) => s + "a", (s: string) => s + "B", (s: string) => "x" + s + "y"];
const acute = "́", dotBelow = "̣", overlay = "̴";
for (let i = 0; i < letters.length; i++) {
  const l = letters[i]!;
  const m = String.fromCharCode(0x363 + i);
  const group = [l, l.toUpperCase(), m, "a" + m, "a" + l, "a" + l.toUpperCase(), "a" + m + dotBelow, "a" + dotBelow + m, "a" + m + acute, "a" + acute + m, "a" + overlay + m, "a" + dotBelow + l];
  const rows: string[] = [];
  for (const f of contexts) {
    let row = "";
    for (const x of group) for (const y of group) row += sign(f(x).localeCompare(f(y))) + 1;
    rows.push(row);
  }
  console.log(l, rows.join(" "));
}
const words = ["ma", "mͣ", "mA", "mͣ́", "ḿͣ", "ṃͣ", "ṃͣ", "mb", "mͤ", "me", "mE", "mͯ", "mx", "mX", "m"];
console.log(words.slice().sort((x, y) => x.localeCompare(y) || (x < y ? -1 : x > y ? 1 : 0)).map((w) => JSON.stringify(w)).join(" "));
