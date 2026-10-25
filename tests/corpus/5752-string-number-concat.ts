// A string plus a number: literal, empty, non-ASCII and shared heads, a
// head ending in a lone high surrogate, integers, -0, negatives,
// fractions, NaN, infinities and large values, and += loops that grow the
// head in place.
const numbers = [0, -0, 7, 42, 4294967295, 4294967296, 2 ** 53, -1, -0.5, 0.1 + 0.2, 1e21, 1e-7, NaN, Infinity, -Infinity];
console.log(numbers.map((n) => "p" + n).join(" "));
console.log(numbers.map((n) => "" + n).join(" "));
console.log(numbers.map((n) => "é" + n).join(" "));
const high = "x\uD83D";
const joined = high + 5;
console.log(joined.length, joined.charCodeAt(1).toString(16), JSON.stringify(joined));
const shared = "id_" + "a".repeat(3);
const ids: string[] = [];
for (let i = 0; i < 5; i++) ids.push(shared + i);
console.log(ids.join(","), shared);
let grow = "";
for (let i = 0; i < 12; i++) grow += i;
let growNonAscii = "ü";
for (let i = 0; i < 6; i++) growNonAscii = growNonAscii + i * 1.5;
console.log(grow, grow.length, growNonAscii, growNonAscii.length);
const keys = new Map<string, number>();
for (let i = 0; i < 100; i++) keys.set("k" + (i % 10), i);
console.log(keys.size, keys.get("k3"), keys.get("k" + 3));
