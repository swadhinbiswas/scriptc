// Searching with lone surrogates follows UTF-16: a needle that starts with
// a low surrogate or ends with a high one matches half of a pair. The
// well-formedness methods, case mapping, normalization and the string
// iterator all treat a lone surrogate as one code unit.
export {};

const smile: string = "🙂";
const high: string = "\uD83D";
const low: string = "\uDE42";
const lone: string = "\uD800";
const text = "x" + smile + "y" + smile + "z";

function units(s: string): string {
  const out: string[] = [];
  for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i).toString(16));
  return out.join(" ");
}

console.log("indexOf", text.indexOf(high), text.indexOf(low), text.indexOf(low, 3), text.indexOf(low, 6), text.indexOf(high + low));
console.log("indexOf edges", text.indexOf(low + "y"), text.indexOf("x" + high), text.indexOf(low + "y" + high), text.indexOf(lone));
console.log("lastIndexOf", text.lastIndexOf(high), text.lastIndexOf(low), text.lastIndexOf(low, 4), text.lastIndexOf(high, 0));
console.log("includes", text.includes(low), text.includes(high), text.includes(low + "y" + high), text.includes(low + high));
console.log("startsWith", smile.startsWith(high), smile.startsWith(low), smile.startsWith(low, 1), text.startsWith(low + "y", 2));
console.log("endsWith", smile.endsWith(low), smile.endsWith(high), smile.endsWith(high, 1), text.endsWith("x" + high, 2));
console.log("lone haystack", (lone + "a" + lone).indexOf(lone), (lone + "a" + lone).lastIndexOf(lone), (lone + "a").includes("a"));
console.log("split pair", units(smile.split("").join(",")), smile.split(smile).length);

console.log("isWellFormed", lone.isWellFormed(), smile.isWellFormed(), (high + low).isWellFormed(), (low + high).isWellFormed(), "abc".isWellFormed());
console.log("toWellFormed", units(lone.toWellFormed()), units(("a" + low + high + "b").toWellFormed()), smile.toWellFormed() === smile);
console.log("toWellFormed length", ("a" + lone).toWellFormed().length, ("é" + high).toWellFormed().length);

console.log("case", units(lone.toUpperCase()), units(("a" + high + "b").toUpperCase()), units(("Ä" + low).toLowerCase()));
console.log("normalize", units(lone.normalize()), units(("é" + high).normalize("NFC")), units(("é" + low).normalize("NFD")));
console.log("trim", units((" " + lone + " ").trim()), units(("\t" + low).trimStart()), units((high + "\n").trimEnd()));

const seen: string[] = [];
for (const ch of "a" + high + smile + low + "b") seen.push(units(ch));
console.log("iterate", seen.join(" | "));
console.log("spread", [...(high + low + lone)].length, Array.from(low + smile).map(units).join(" | "));

console.log("compare", lone === "\uD800", lone !== "\uDFFF", (high + low) === smile, smile.localeCompare(smile));
console.log("switch", ((s: string) => { switch (s) { case "\uD800": return "first"; case "\uDFFF": return "last"; default: return "other"; } })(lone));
console.log("switch last", ((s: string) => { switch (s) { case "\uD800": return "first"; case "\uDFFF": return "last"; default: return "other"; } })("\uDFFF"));
