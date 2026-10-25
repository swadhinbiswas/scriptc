// path.matchesGlob extglobs: +(…), *(…), ?(…), @(…) and !(…), nested,
// empty, unterminated, mixed with stars and classes, and next to dots.
import * as path from "node:path";

const paths = [
  "", "a", "aa", "aaa", "b", "ab", "ba", "abab", "c", "ac", "abc", "bc", "x.js", "x.ts", "a.js",
  "foo.js", "foobar.js", "bar.js", ".js", ".a", "a/b", "x/a/y", "x/b/y", "x/c/y", "+(a)", "a)",
  "(a)", "!a", "a!b", "a.b", "foo", "foo.min.js", "index.ts", "b/c", "a/c",
];
const patterns = [
  "+(a)", "*(a)", "?(a)", "@(a)", "!(a)", "!(a|b)", "+(a|b)", "*(a|b)c", "a+(b)", "a*(b)", "a?(b)",
  "a@(b|c)", "a!(b)", "!(*.js)", "!(.*)", "*.!(js)", "!(a)/b", "a/!(b)", "+(a|*.js)", "@(a|b)/**",
  "!(!(a))", "+(+(a))", "*(+(a))", "?(*(a))", "@(+(a))", "+(?(a))", "!(@(a))", "@(!(a))",
  "+(*(a)|b)", "*(a|+(b))", "!()", "+()", "@()", "?()", "*()", "a!()", "!(a", "+(a", "a)", "(a)",
  "+(a)b)", "!(a)*", "*!(a)", "+(a|)", "@(|a)", "!(|a)", "x/+(a|b)/y", "x/!(a)/y", "+([a-c])",
  "!([a-c])", "@(*.ts|*.js)", "**/@(a|b).js", "?(a|b|c)?", "!(foo).js", "!(foo)*.js", "+(!(a))",
  "*(!(a))", "!(+(a))", "!(*(a))", "!(?(a))", "+(a|b)+(c|d)", "!(a).!(b)", "@(a|b|c|d|e|f|g)",
  "*(?)", "+(*)", "!(*)", "@(*)", "?(*)", "*.+(js|ts)", "!(*.min).js", "@(a)/*", "!(x)/**",
];
for (const pattern of patterns) {
  const row = paths.map((p) => (path.posix.matchesGlob(p, pattern) ? "1" : "0")).join("");
  console.log(JSON.stringify(pattern).padEnd(18), row);
}
