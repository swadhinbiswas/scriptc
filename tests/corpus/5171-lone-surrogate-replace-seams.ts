// Replacements that put lone surrogate halves next to each other form a
// surrogate pair, as in Node.
const hi = "\uD83D";
const lo = "\uDE00";
const show = (s: string): string =>
  `${s.length} ${[...s].map((c) => c.codePointAt(0)!.toString(16)).join(",")} ${s === "\u{1F600}"}`;

// Literal search: deleting the ASCII between the halves joins them.
console.log(show((hi + "x" + lo).replace("x", "")));
console.log(show((hi + "x" + lo).replaceAll("x", "")));
console.log(show(("a" + "x").replace("a", hi).replace("x", lo)));

// Chains of one-character replacements.
console.log(show((hi + "-" + lo).replace(/-/g, "").replace(/\+/g, "")));
console.log(show(("<>").replace(/</g, hi).replace(/>/g, lo)));

// Regex replacements over an ASCII subject: adjacent substitutions meet.
console.log(show("ab".replace(/[ab]/g, (m) => (m === "a" ? hi : lo))));
console.log(show("aa".replace(/a/g, lo + hi)));
console.log(show("xaay".replace(/a/g, lo + hi)));
console.log(show("aa".replace(/a/g, "$&" + hi)));
