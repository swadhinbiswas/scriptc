// A ternary whose arms are all string literals yields an interned literal,
// which nothing owns: it is neither retained nor released wherever it goes
// (fields, arrays, maps, returns, closures, concatenations, comparisons).
// The sanitized lane checks that every other string is still freed once.

class Entry {
  label: string;
  tags: string[] = [];
  constructor(label: string) {
    this.label = label;
  }
}

function sep(i: number): string {
  return i === 0 ? "" : i % 2 === 0 ? ", " : "; ";
}

function describe(n: number): string {
  const sign = n < 0 ? "negative" : n === 0 ? "zero" : "positive";
  const parity = n % 2 === 0 ? "even" : "odd";
  return sign + "/" + parity;
}

const entries: Entry[] = [];
const counts = new Map<string, number>();
let joined = "";
const keep: (() => string)[] = [];
for (let i = -3; i <= 4; i++) {
  const e = new Entry(i > 0 ? "up" : "down");
  e.label = i === 0 ? "level" : e.label;
  e.tags.push(i % 3 === 0 ? "triple" : "plain", describe(i));
  entries.push(e);
  const key = i % 2 === 0 ? "even" : "odd";
  counts.set(key, (counts.get(key) ?? 0) + 1);
  joined += sep(i + 3) + (i < 0 ? "m" : "p") + Math.abs(i);
  const word = i > 2 ? "late" : "early";
  keep.push(() => word + i);
}
console.log(entries.map((e) => `${e.label}:${e.tags.join("+")}`).join(" "));
console.log([...counts].map(([k, v]) => `${k}=${v}`).join(" "), joined);
console.log(keep.map((f) => f()).join(","));
console.log(describe(-5) === "negative/odd", sep(0).length, sep(3) === sep(1));
