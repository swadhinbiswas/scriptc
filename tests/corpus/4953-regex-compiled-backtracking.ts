// Native regex matchers under heavy backtracking: nested quantifiers on
// failing inputs, long give-back runs, and backtrack stacks that grow far
// past their inline size. Results match the interpreter and Node.
export {};

function show(m: RegExpExecArray | null): string {
  if (m === null) return "null";
  const parts: string[] = [];
  for (let i = 0; i < m.length; i++) parts.push(m[i] === undefined ? "undefined" : `${m[i]!.length}`);
  return `${m.index}: ${parts.join(", ")}`;
}

// Exponential in the input length; small enough to finish quickly.
for (const n of [4, 10, 16, 18]) {
  const s = "a".repeat(n);
  console.log(n, /(a+)+b/.test(s), /(a|aa)+c/.test(s), show(/(a*)*$/.exec(s)), /(?:a?){12}a{12}/.test(s));
}
console.log(show(/^(\w+\s?)*$/.exec("word word word word word!")), show(/^(\w+\s?)*$/.exec("word word word")));
console.log(show(/(x+x+)+y/.exec("xxxxxxxxxxxxxx")), show(/(x+x+)+y/.exec("xxxxxy")));

// Long give-back and lazy extension.
const long = "a".repeat(5000) + "b" + "a".repeat(5000);
console.log(show(/(.*)b(.*)/.exec(long)), show(/(.*?)b/.exec(long)), show(/a*?b/.exec(long)));
console.log(show(/(a*)a{4000}b/.exec(long)), show(/^(?:a|b)*$/.exec(long)), /^(?:a|b)*c/.test(long));
console.log(show(/((?:ab)*?)c/.exec("ab".repeat(3000) + "c")), show(/(?:(a)|b)*$/.exec("ab".repeat(4000))));
console.log(show(/(\w+)\s(\w+)$/.exec("x ".repeat(2000) + "end here")));

// Many alternatives and deep nesting.
const kw = /\b(?:if|else|while|for|return|function|const|let|var|class|new|this)\b/g;
console.log(JSON.stringify("let x = new Foo(); if (x) return this; else while (1) {}".match(kw)));
console.log(show(/((((((((((a))))))))))+/.exec("aaa")), show(/(?:(?:(?:(?:a|b)c)?d)*e)+/.exec("acdbcdedebcde")));

// The same regex reused across many subjects.
const ip = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
let valid = 0;
for (let i = 0; i < 2000; i++) {
  const s = `${i % 300}.${(i * 7) % 260}.${i % 10}.${(i * 13) % 999}`;
  const m = ip.exec(s);
  if (m !== null && m.slice(1).every((x) => Number(x) < 256)) valid++;
}
console.log("valid", valid);
