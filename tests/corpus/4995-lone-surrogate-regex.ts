// Regular expressions see lone surrogates as code units: matches, captures,
// replacements and splits that cut a surrogate pair return lone halves, and
// RegExp.escape escapes a lone surrogate as \uXXXX.
export {};

const smile: string = "🙂";
const high: string = "\uD83D";
const low: string = "\uDE42";

function units(s: string): string {
  const out: string[] = [];
  for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i).toString(16));
  return out.join(" ");
}

console.log("dot", units(/./.exec(smile)![0]), units(/./u.exec(smile)![0]), (smile + "x").match(/./g)!.map(units).join(" | "));
console.log("class", /^[\uD800-\uDBFF]$/.test(high), /^[\uDC00-\uDFFF]$/.test(low), /^[\uD800-\uDFFF]$/.test(smile));
console.log("escape match", /\uDE42/.test(smile), /\uDE42/u.test(smile), units("a" + low + "b".replace(/b/, high)));
console.log("capture", units(/(.)(.)/.exec(smile)![1]), units(/(.)(.)/.exec(smile)![2]), /(.)(.)/.exec(smile)![1] + /(.)(.)/.exec(smile)![2] === smile);
console.log("replace halves", units(smile.replace(/\uD83D/, "<")), units(smile.replace(/\uDE42/, ">")));
console.log("replace empty", units(smile.replace(/(?:)/g, "-")), units(smile.replace(/(?:)/gu, "-")));
console.log("replace callback", units(("x" + smile).replace(/[\uD800-\uDFFF]/g, (m) => units(m) + ";")));
console.log("replace joins", (high + "-" + low).replace(/-/, "") === smile, ("<" + low).replace(/</, high) === smile);
console.log("split", smile.split(/(?:)/).map(units).join(" | "), smile.split(/(?:)/u).length, ("a" + smile + "b").split(/\uDE42/).map(units).join(" | "));
console.log("lone subject", /\uD800/.test("a\uD800b"), "a\uD800b".search(/\uD800/), units("a\uD800b".replace(/a/, "")));
console.log("matchAll", [...(smile + smile).matchAll(/[\uD83D\uDE42]/g)].map((m) => units(m[0])).join(","));
console.log("RegExp.escape", RegExp.escape(high + "a" + low), RegExp.escape(smile), RegExp.escape("." + low));
