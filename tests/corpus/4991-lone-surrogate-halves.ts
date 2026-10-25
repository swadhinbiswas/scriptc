// Every string operation that splits a surrogate pair keeps the half it
// returns as a lone surrogate, and every builder that puts a lone high
// surrogate directly before a lone low one produces the paired character.
export {};

const smile: string = "🙂";
const rocket: string = "\u{1F680}";
const high: string = "\uD83D";
const low: string = "\uDE42";

function units(s: string): string {
  const out: string[] = [];
  for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i).toString(16));
  return out.join(" ");
}

// Indexing and slicing.
const text = "a" + smile + "b" + rocket;
console.log("charAt", units(text.charAt(1)), units(text.charAt(2)), text.charAt(1) === high, text.charAt(2) === low);
console.log("index", units(text[1]), units(text[5]), text[2] === low);
console.log("at", units(text.at(-1)!), units(text.at(-2)!), units(text.at(2)!));
console.log("slice", units(text.slice(0, 2)), units(text.slice(2, 4)), units(text.slice(-1)), text.slice(1, 3) === smile);
console.log("substring", units(text.substring(2)), units(text.substring(5, 1)));
console.log("codePointAt", text.codePointAt(1)!.toString(16), text.codePointAt(2)!.toString(16), high.codePointAt(0)!.toString(16));
for (let i = 0; i < smile.length; i++) console.log("unit", i, units(smile[i]), smile[i].length);

// String.fromCharCode keeps lone units and pairs adjacent halves.
console.log("fromCharCode", units(String.fromCharCode(0xd800)), String.fromCharCode(0xd83d, 0xde42) === smile);
console.log("fromCharCode mixed", units(String.fromCharCode(0xde42, 0xd83d, 0x41, 0xdbff)));
const codes = [0xd83d, 0xde42, 0xdc00];
console.log("fromCharCode spread", units(String.fromCharCode(...codes)), String.fromCharCode(...codes).slice(0, 2) === smile);
console.log("fromCodePoint", units(String.fromCodePoint(0xd800, 0x1f642)), String.fromCodePoint(0xd83d, 0xde42) === smile);

// Padding with an astral fill that is cut in the middle.
console.log("padEnd", units("ab".padEnd(3, smile)), units("ab".padEnd(5, smile)));
console.log("padStart", units("ab".padStart(3, rocket)), "ab".padStart(4, smile) === smile + "ab");
console.log("pad pair", (low + "z").padStart(5, smile) === smile + smile + "z", units("ab".padEnd(6, low + high)));
console.log("pad joins", units(low.padStart(2, smile)), low.padStart(2, smile) === smile.slice(0, 1) + low);

// Builders: repeat, join, template literals, +=, concat chains, replace.
const pairLater = low + "x" + high;
console.log("repeat", pairLater.repeat(3).length, units(pairLater.repeat(2)));
const turned = low + high;
console.log("repeat joins", turned.repeat(3).length, turned.repeat(3).slice(1, 3) === smile);
console.log("join", [high, low].join("") === smile, [high, low].join("-").length, ["", high, "", low, ""].join("") === smile);
console.log("join numbers", units([high, 1, low].join("")));
console.log("template", `${high}${low}${high}${low}` === smile + smile, `${high}${1}${low}`.length);
let acc = "";
for (let i = 0; i < 4; i++) acc += i % 2 === 0 ? high : low;
console.log("append", acc === smile + smile, acc.length);
let chain = "start:";
chain = chain + high;
chain = chain + low;
console.log("chain", chain === "start:" + smile, chain.length);
const mixed = high + 7 + low;
console.log("mixed", units(mixed), units(high + "" + low));
console.log("replace", (high + "-" + low).replace("-", "") === smile, units((high + "-" + low).replace("-", "|")));
console.log("replaceAll", (high + "." + low + "." + high + "." + low).replaceAll(".", "") === smile + smile);
console.log("replace insert", ("[" + low).replace("[", high) === smile, (high + "]").replace("]", low) === smile);
console.log("replace template", (high + "-" + low).replace("-", "$`").length, units(("a-" + low).replace("-", high)));
console.log("String.raw", String.raw`${high}${low}` === smile);

// Sorting compares UTF-16 code units, lone surrogates included.
const list = [low, smile, "\uFFFF", high, "\uE000", "a", "\uD800", rocket, "\u{10FFFF}"];
console.log("sort", list.slice().sort().map(units).join(" | "));
console.log("sort pairs", ["\uDC00", smile, "\uDBFF", "\uD83E"].sort().map(units).join(" | "));
