// JSON.stringify escapes each lone surrogate as \udXXX (lowercase) and keeps
// surrogate pairs; JSON.parse keeps escaped lone surrogates and joins
// escaped halves. util.inspect and console.log show lone surrogates as
// escapes inside quoted strings.
import { inspect } from "node:util";

const smile: string = "🙂";
const high: string = "\uD83D";
const low: string = "\uDE42";

function units(s: string): string {
  const out: string[] = [];
  for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i).toString(16));
  return out.join(" ");
}

interface Row {
  name: string;
  tags: string[];
}

const rows: Row[] = [
  { name: "a" + high, tags: [low, smile, low + high] },
  { name: "􏿿", tags: ["\uDC00\uD800", "plain", "é" + low] },
];
console.log(JSON.stringify(rows));
console.log(JSON.stringify(rows, null, 2));
console.log(JSON.stringify({ [high]: 1, [smile]: 2, ["k" + low]: [high, 3] }));
console.log(JSON.stringify(high + "\n\"" + low), JSON.stringify(" " + high));

const back = JSON.parse(JSON.stringify(rows)) as Row[];
console.log(back[0].name === rows[0].name, back[0].tags[2] === low + high, back[1].name === "\u{10FFFF}");
console.log(units(JSON.parse('"\\uD83D"')), units(JSON.parse('"\\uDE42\\uD83D"')), JSON.parse('"\\uD83D\\uDE42"') === smile);
console.log(units(JSON.parse('"\\ud83d\\u0041"')), units(JSON.parse('"x\\udfff"')), JSON.parse('["\\ud83d", "\\ude42"]').join("") === smile);
const parsed = JSON.parse('{"\\ud800": "\\udc00"}') as Record<string, string>;
console.log(units(Object.keys(parsed)[0]), units(parsed["\uD800"]));

console.log(inspect(high), inspect([high, low, smile]), inspect({ [low]: high }));
console.log(inspect("it's " + high), inspect(new Map([[high, low]])));
console.log([high, "x" + low], { k: low });
