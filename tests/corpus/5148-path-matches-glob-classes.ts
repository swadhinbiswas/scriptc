// path.matchesGlob bracket expressions: ranges, negation, POSIX classes,
// unterminated and reversed brackets, escapes, non-ASCII members, and the
// TypeError for an over-long pattern.
import { posix } from "node:path";

const paths = [
  "", "a", "b", "c", "z", "0", "5", "9", "_", "-", "]", "[", "!", "^", ".", " ", "\t", "\n", "\x01",
  "é", "ü", "ß", "日", "😀", "\ud83d", "a]", "[a]", "ab", "a5", "5a", "*", "?", "\\", "a/b", "f",
  "x", "{", ",", "+", "~", "\x7f",
];
const patterns = [
  "[abc]", "[a-c]", "[!a]", "[^a]", "[a-]", "[-a]", "[]]", "[]a]", "[!]]", "[a-z0-9]", "[z-a]",
  "[a", "a]", "[[]", "[\\]]", "[.]", "[.]*", "[[:alpha:]]", "[[:digit:]]*", "[[:upper:]]",
  "[[:lower:]]", "[[:alnum:]_]", "[[:space:]]", "[[:punct:]]", "[[:xdigit:]]", "[[:word:]]",
  "[[:ascii:]]", "[![:alpha:]]", "[[:graph:]]", "[[:print:]]", "[[:cntrl:]]", "[[:blank:]]",
  "[a-[:digit:]]", "[[:bogus:]]", "[é]", "[😀]", "[à-ü]", "[^[:ascii:]]", "[[:alpha:][:digit:]]",
  "[a-c][0-9]", "?[a-c]", "[a/b]", "[*]", "[?]", "\\*", "\\?", "[\\\\]", "[{,}]", "[+~]",
  "[[:digit:]-]", "[!-]", "[ -~]", "[\\x00-\\x1f]", "*[!a-z]*",
];
for (const pattern of patterns) {
  const row = paths.map((p) => (posix.matchesGlob(p, pattern) ? "1" : "0")).join("");
  console.log(JSON.stringify(pattern).padEnd(24), row);
}

// Node caps patterns at 64 Ki UTF-16 code units.
const long = "a".repeat(65536);
console.log(posix.matchesGlob(long, long));
try {
  console.log(posix.matchesGlob("a", long + "a"));
} catch (e) {
  console.log(e instanceof TypeError, (e as Error).message);
}
