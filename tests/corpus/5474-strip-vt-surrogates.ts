// util.stripVTControlCharacters keeps lone surrogates, joins a lone high
// and a lone low surrogate brought together by a removal into one code
// point, leaves text without escapes unchanged, and throws Node's
// ERR_INVALID_ARG_TYPE for non-string arguments.
import { stripVTControlCharacters } from "node:util";

const joined = stripVTControlCharacters("\ud800\u001b[1m\udfff");
console.log(JSON.stringify(joined), joined.length, joined.codePointAt(0)?.toString(16));
const lone = stripVTControlCharacters("\ud800\u001b]x\u0007\ud800");
console.log(JSON.stringify(lone), lone.length);
const low = stripVTControlCharacters("\udfff\u001b[0m\ud800");
console.log(JSON.stringify(low), low.length);
const plain = "no escapes here 😀";
console.log(stripVTControlCharacters(plain) === plain);
for (const value of [42, null, undefined, { text: "x" }, ["a"]]) {
  try {
    stripVTControlCharacters(value as unknown as string);
  } catch (error) {
    const e = error as Error & { code?: string };
    console.log(e.name, e.code, e.message);
  }
}
