// Lone UTF-16 surrogates are ordinary string contents: literals keep their
// own code unit, split("") of an astral character yields its two halves,
// and joining the halves again rebuilds the original character.
export {};

const smile: string = "🙂";
const high: string = "\uD83D";
const low: string = "\uDE42";
const first: string = "\uD800";
const last: string = "\uDFFF";

function units(s: string): string {
  const out: string[] = [];
  for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i).toString(16));
  return out.join(" ");
}

// Literals.
console.log("length", first.length, last.length, ("a" + first + "b").length);
console.log("units", units(first), units(last), units("x" + high + "y" + low + "z"));
console.log("equal", first === last, first === "\uD800", last !== "\uDFFF", high === smile);
console.log("string", String(first) === first, String(first).charCodeAt(0));

// split("") and join("") round trips.
const halves = smile.split("");
console.log("split", halves.length, units(halves[0]), units(halves[1]));
console.log("halves", halves[0] === high, halves[1] === low);
console.log("join", halves.join("") === smile, halves.join("").length, units(halves.join("|")));
const text = "a🙂b😀c";
console.log("round trip", text.split("").join("") === text, text.split("").length);
console.log("reverse", units(smile.split("").reverse().join("")));
console.log("rejoined reverse", smile.split("").reverse().reverse().join("") === smile);

// Concatenation and template literals rebuild a pair from its halves.
console.log("concat", high + low === smile, (high + low).length, units(high + low));
console.log("template", `${high}${low}` === smile, `<${high}${low}>`.length, `${first}!`.length);
let built = "";
for (const piece of halves) built += piece;
console.log("append", built === smile, built.length);

// Searching.
console.log("includes", smile.includes(high), smile.includes(low), text.includes(first), ("a" + first).includes(first));
console.log("indexOf", smile.indexOf(low), smile.indexOf(high), ("ab" + first + "c").indexOf(first), text.indexOf(low));
console.log("lastIndexOf", (smile + smile).lastIndexOf(high), (first + "x" + first).lastIndexOf(first));

// JSON.stringify escapes lone surrogates and keeps pairs.
console.log("json", JSON.stringify(first), JSON.stringify([high, low, smile]), JSON.stringify({ [last]: first + "x" }));
console.log("json parse", units(JSON.parse('"\\ud800"')), JSON.parse('"\\ud83d\\ude42"') === smile, JSON.parse(JSON.stringify(high)) === high);

// Map keys distinguish the units, and a rebuilt pair finds the original key.
const map = new Map<string, string>();
map.set(first, "first");
map.set(last, "last");
map.set(smile, "smile");
console.log("map", map.size, map.get("\uD800"), map.get("\uDFFF"), map.get(high + low), map.has(high));
const seen = new Set<string>([first, last, "\uD800", halves[0], high]);
console.log("set", seen.size);
