// path.matchesGlob brace expansion: lists, nesting, numeric and letter
// sequences with steps and padding, and empty and unbalanced braces.
import { matchesGlob } from "node:path";

const paths = [
  "", "a", "b", "c", "d", "ab", "ac", "abc", "a1", "b2", "c3", "1", "2", "3", "4", "7", "10", "01",
  "02", "03", "-1", "-2", "0", "e", "a/c", "b/c", "a/b", "xay", "xby", "xy", "{}", "{a}", "a{}",
  "{a,b}", "${a,b}", "$a", "a.js", "a.ts", "a.mjs", "b.ts", "z", "y",
];
const patterns = [
  "{a,b}", "{a,b}/c", "{,a}", "{a,}", "{a}", "{}", "{}a", "a{}", "{a,b{c,d}}", "{a..c}", "{c..a}",
  "{1..3}", "{01..3}", "{3..1}", "{1..10..3}", "{a..e..2}", "{-2..2}", "{a,b,c}{1,2,3}", "x{a,b}y",
  "x{,a}y", "{a/b,c}", "${a,b}", "{a,b}}", "{{a,b}", "{a,{b,c}}", "{a\\,b}", "{1..1}", "{x..z,a}",
  "a{b,c}", "a{b..c}", "a{b,c", "{a,b,c,d,e}{,c}", "*{.js,.ts}", "{a,b}.{js,ts,mjs}", "{0..10..5}",
  "{10..0..5}", "{1..3..-1}", "{a..a}", "{1..a}", "{a..1}", "{..}", "{1..}", "{,}", "{,,}", "{a,,b}",
  "{{}}", "{a,b}{}", "?{b,c}", "*{1,2}", "{[ab],c}", "{!(a),b}", "{@(a|b),c}",
];
for (const pattern of patterns) {
  const row = paths.map((p) => (matchesGlob(p, pattern) ? "1" : "0")).join("");
  console.log(JSON.stringify(pattern).padEnd(20), row);
}

// Long sequences, padded and unpadded.
console.log(matchesGlob("4999", "{1..5000}"), matchesGlob("5001", "{1..5000}"), matchesGlob("0042", "{0001..0100}"));

