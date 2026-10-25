// Numbers concatenated into strings are formatted straight into the result:
// `s + n`, `n + s`, multi-part chains, and `s += sep + n` appends. Every
// Number::toString shape must match, operands must evaluate in order, and an
// in-place append must never be visible through another reference.

const samples = [0, -0, 1, -1, 42, 3.14, -2.5e-7, 1e21, 123456789012345680000, 0.1 + 0.2, 2 ** 53, -(2 ** 31), NaN, Infinity, -Infinity, 5e-324, 1.7976931348623157e308];

for (const n of samples) {
  console.log("s+n " + n, n + " n+s", "[" + n + "]", `${n}|${n * 2}`);
}

// Comma-separated keys, the shape of a type-list cache key.
function listKey(ids: number[]): string {
  let key = "";
  for (let i = 0; i < ids.length; i++) key += (i === 0 ? "" : ",") + ids[i];
  return key;
}
console.log(listKey([]), listKey([7]), listKey([1, 22, 333, 4444, -5, 0.5]));
const long: number[] = [];
for (let i = 0; i < 300; i++) long.push(i * 37 - 1000);
const longKey = listKey(long);
console.log(longKey.length, longKey.slice(0, 40), longKey.slice(-30));

// Appends grow a uniquely held string; an alias taken mid-way keeps its value.
let acc = "start";
const snapshots: string[] = [];
for (let i = 0; i < 40; i++) {
  acc += "-" + i;
  if (i % 13 === 0) snapshots.push(acc);
  acc += i;
}
console.log(acc.length, acc.slice(-24));
console.log(snapshots.map((s) => s.length + ":" + s.slice(-6)).join(" "));

// Self-referencing suffixes read the value from before the assignment.
let self = "ab";
self += self + 1;
self += 2 + self;
console.log(self);

// Left-to-right evaluation of every operand, including the number parts.
const log: string[] = [];
function num(label: string, value: number): number {
  log.push(label);
  return value;
}
function str(label: string, value: string): string {
  log.push(label);
  return value;
}
let ordered = str("init", "<");
ordered += str("a", "a") + num("1", 1) + str("b", "b") + num("2", 2.5);
const chain = num("x", -3) + str("c", "c") + num("y", 4e-9);
console.log(ordered, chain, log.join(","));

// Unicode strings around numbers keep their code-unit view consistent.
let wide = "é😀";
wide += "→" + 12;
wide += 3.5;
console.log(wide, wide.length, wide.charCodeAt(wide.length - 1), wide.indexOf("1"), wide.slice(3));

// Many parts, more than one bounded group.
const a = 1, b = "two", c = 3, d = "four", e = 5.5, f = "six", g = 7, h = "eight", i9 = 9;
console.log(a + b + c + d + e + f + g + h + i9 + a + b + c + d + e + f + g + h + i9 + a + b);
let big = "";
big += a + "|" + b + "|" + c + "|" + d + "|" + e + "|" + f + "|" + g + "|" + h + "|" + i9 + "|" + a;
console.log(big);

// A string built in a closure and returned keeps its value after more appends.
function builder(): () => string {
  let s = "";
  return () => {
    s += s.length + ";";
    return s;
  };
}
const next = builder();
const first = next();
const second = next();
const third = next();
console.log(first, second, third);
