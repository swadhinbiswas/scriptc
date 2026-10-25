// path.win32.matchesGlob: both separators, drive letters, UNC and \\?\
// roots, backslashes never escaping; then a seeded grid comparing the
// posix and win32 families over generated paths and patterns.
import * as path from "node:path";
import { matchesGlob } from "node:path/win32";

const paths = [
  "a\\b", "a/b", "c:\\a\\b", "c:/a/b", "c:\\a", "d:\\a\\b", "c:", "\\a", "/a", "\\\\server\\share\\x",
  "//server/share/x", "\\\\server\\share", "//?/c:/x", "\\\\?\\c:\\x", "a\\b\\c.js", "a/b\\c.js",
  "x", ".x", "a\\.b", "a*b", "a?b", "a\\*b", "\\\\a\\b\\c\\d",
];
const patterns = [
  "a/b", "a\\b", "a/*", "a\\*", "*/*", "**", "**/*.js", "**\\*.js", "c:/a/*", "c:\\a\\*", "c:/**",
  "c:/a", "?:/a/b", "*:/a/b", "[cd]:/a/b", "//server/share/*", "\\\\server\\share\\*",
  "//server/share", "//*/share/x", "//server/*/x", "//?/c:/*", "//?/c:/x", "*/share/*", "**/x",
  "**/.x", "a/.*", "a\\*b", "a\\?b", "a*b", "\\a", "/a", "{a,c:}/**", "+(a|b)/*", "a/**/*.js",
];
for (const pattern of patterns) {
  const row = paths.map((p) => (matchesGlob(p, pattern) ? "1" : "0")).join("");
  console.log(JSON.stringify(pattern).padEnd(24), row);
}
console.log(path.win32.matchesGlob("c:\\work\\src\\app.ts", "c:/work/**/*.ts"));

// Seeded grid: answers for both families, packed per pattern.
let seed = 5149;
const random = (): number => {
  seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
  return seed / 4294967296;
};
const pick = (list: string[]): string => list[Math.floor(random() * list.length)];
const make = (tokens: string[], max: number): string => {
  let s = "";
  const n = 1 + Math.floor(random() * max);
  for (let i = 0; i < n; i++) s += pick(tokens);
  return s;
};
const pathTokens = ["a", "b", ".", "..", "/", "\\", "ab", "1", "c:", "-", "é"];
const patternTokens = [
  "a", "b", ".", "/", "\\", "*", "**", "?", "[a-b]", "[!a]", "{a,b}", "{1..2}", "+(a)", "!(b)",
  "@(a|b)", "c:", "[[:alpha:]]", "..", "(", ")", "|", "{", "}", ",",
];
const gridPaths: string[] = [];
for (let i = 0; i < 40; i++) gridPaths.push(make(pathTokens, 5));
// A class next to an escaped character can make an invalid u-flag regex:
// Node throws its SyntaxError, recorded here as "E".
const answer = (match: (p: string, pattern: string) => boolean, p: string, pattern: string): string => {
  try {
    return match(p, pattern) ? "1" : "0";
  } catch (e) {
    return e instanceof SyntaxError ? "E" : "?";
  }
};
let errors = 0;
for (let i = 0; i < 60; i++) {
  const pattern = make(patternTokens, 6);
  let row = "";
  for (const p of gridPaths) {
    const a = answer(path.posix.matchesGlob, p, pattern);
    const b = answer(path.win32.matchesGlob, p, pattern);
    if (a === "E") errors++;
    row += a + b + " ";
  }
  console.log(JSON.stringify(pattern).padEnd(28), row.trimEnd());
}
console.log("errors", errors);
try {
  path.win32.matchesGlob("a", "\\,[[:alpha:]]");
} catch (e) {
  // The detail after the last ": " is the regex engine's own wording.
  const message = (e as Error).message;
  console.log((e as Error).name, message.slice(0, message.lastIndexOf(": ")));
}
