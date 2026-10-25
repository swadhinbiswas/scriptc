// Native regex matchers under the global and sticky lastIndex protocol:
// exec/test loops, empty matches that advance by one code unit (or one code
// point under the u flag), sticky anchoring, and subjects that switch
// between ASCII and non-ASCII text on the same regex.
export {};

const word = /[a-z]+/g;
const text = "alpha beta  gamma";
for (let i = 0; i < 5; i++) {
  const m = word.exec(text);
  console.log(m === null ? "null" : `${m[0]}@${m.index}`, word.lastIndex);
}

const digits = /\d+/g;
let count = 0;
while (digits.test("a1b22c333")) count++;
console.log("test loop", count, digits.lastIndex);
digits.lastIndex = 4;
console.log(digits.exec("a1b22c333")?.[0], digits.lastIndex);
digits.lastIndex = 99;
console.log(digits.exec("a1b22c333"), digits.lastIndex);

// Sticky: one anchored attempt at lastIndex.
const sticky = /\d+|[a-z]/y;
const parts: string[] = [];
for (let i = 0; i < 8; i++) {
  const m = sticky.exec("12ab3-4");
  parts.push(m === null ? `null@${sticky.lastIndex}` : `${m[0]}@${m.index}`);
}
console.log(parts.join(" "));
const stickyG = /a|b/gy;
console.log(JSON.stringify("aabxab".match(stickyG)), "aabxab".replace(stickyG, "_"));
console.log(/b/y.test("ab"), /^b/my.test("a\nb"), JSON.stringify("ab".split(/b/y)));

// Empty matches advance past the current position.
console.log(JSON.stringify("abc".match(/x*/g)));
console.log("abc".replace(/x*/g, "-"));
console.log("abc".replace(/(?:)/g, "."));
console.log(JSON.stringify("a,b,,c".split(/,*/)));
console.log(JSON.stringify("ab12cd".match(/\d*/g)));
const empties: string[] = [];
for (const m of "aXbX".matchAll(/X?/g)) empties.push(`${m[0]}@${m.index}`);
console.log(JSON.stringify(empties));

// Non-ASCII subjects run on the interpreter; ASCII ones on the native
// matcher. lastIndex is a UTF-16 index either way.
const mixed = /[a-z]+/g;
for (const s of ["hé llo", "hello", "😀ab😀cd"]) {
  mixed.lastIndex = 0;
  const seen: string[] = [];
  for (let m = mixed.exec(s); m !== null; m = mixed.exec(s)) seen.push(`${m[0]}@${m.index}/${mixed.lastIndex}`);
  console.log(JSON.stringify(s), seen.join(" "));
}
// Empty-match advancement: code units without u, code points with u.
console.log(JSON.stringify("😀a".match(/(?:)/g)), JSON.stringify("😀a".match(/(?:)/gu)));
console.log("😀a".replace(/x*/g, "-") === "-\ud83d-\ude00-a-", "😀a".replace(/x*/gu, "-"));
console.log(JSON.stringify("a😀b".split(/(?:)/u)), "a😀b".split(/(?:)/).length);
const eu = /\b|$/gu;
const idx: number[] = [];
for (let m = eu.exec("ab 😀 c"); m !== null && idx.length < 10; m = eu.exec("ab 😀 c")) {
  idx.push(m.index);
  if (m[0] === "") eu.lastIndex = eu.lastIndex + 1;
}
console.log(idx.join(","));

// search ignores lastIndex and leaves it alone.
const g = /c/g;
g.lastIndex = 3;
console.log("abcabc".search(g), g.lastIndex, "abc".search(/x/), "abc".search(/^/));

// Literal sites in a loop reset their own state each evaluation.
for (let i = 0; i < 3; i++) console.log(/o/g.exec("foo boo")?.[0], /o/g.test("xo"), "foo".search(/o/g));
