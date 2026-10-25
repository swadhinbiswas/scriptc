// BigInt text conversion: every radix, round trips, digit-group padding
// in large values, and StringToBigInt edge cases.
function factorial(n: number): bigint {
  let r = 1n;
  for (let i = 2; i <= n; i++) r = r * BigInt(i);
  return r;
}
const values: bigint[] = [
  1n,
  9n,
  10n,
  (1n << 64n) - 1n,
  1n << 64n,
  10n ** 19n,
  10n ** 19n - 1n,
  10n ** 38n,
  10n ** 400n,
  10n ** 400n - 1n,
  10n ** 400n + 1n,
  7n * 10n ** 1200n + 3n,
  factorial(300),
  factorial(1000),
  (1n << 4000n) - 1n,
  -(3n ** 2000n),
];
let sum = 0;
for (const v of values) {
  for (let radix = 2; radix <= 36; radix++) {
    const text = v.toString(radix);
    sum = (sum * 31 + text.length + text.charCodeAt(text.length >> 1)) % 1000000007;
    if (radix === 2 || radix === 8 || radix === 16 || radix === 10) {
      const neg = text.startsWith("-");
      const digits = neg ? text.slice(1) : text;
      const prefix = radix === 2 ? "0b" : radix === 8 ? "0o" : radix === 16 ? "0x" : "";
      const back = BigInt(prefix + digits);
      if ((neg ? -back : back) !== v) throw new Error("round trip " + radix);
    }
  }
}
console.log("radix digest", sum);
const big = 10n ** 400n - 1n;
console.log("nines", big.toString().length, /^9+$/.test(big.toString()));
const p = 10n ** 400n + 1n;
console.log("zeros", p.toString().length, p.toString().split("0").length - 1);
console.log("small", (255n).toString(2), (255n).toString(36), (-255n).toString(16), (0n).toString(7));
console.log("factorial digits", factorial(1000).toString().length, factorial(1000).toString().slice(0, 20));
const inputs = [
  "",
  "   ",
  "0",
  "-0",
  "+0",
  "007",
  "  123  ",
  "\t\n-42\r\n",
  "0x1F",
  "0X1f",
  "0o17",
  "0O17",
  "0b101",
  "0B101",
  "0x",
  "-0x1",
  "+0x1",
  "1e3",
  "1.0",
  "12a",
  "--1",
  "0b102",
  "0o8",
  "99999999999999999999999999999999999999",
  "-18446744073709551616",
  "0x" + "f".repeat(70),
  "1" + "0".repeat(500),
];
for (const s of inputs) {
  try {
    console.log(JSON.stringify(s.length > 40 ? s.slice(0, 12) + "..." : s), BigInt(s) % 1000000007n);
  } catch (e) {
    console.log(JSON.stringify(s.length > 40 ? s.slice(0, 12) + "..." : s), (e as Error).name);
  }
}
for (const r of [1, 37, 2.5, 36.9, 1.9, NaN, -Infinity]) {
  try {
    console.log("radix", r, (35n).toString(r));
  } catch (e) {
    console.log("radix", r, (e as Error).name, (e as Error).message);
  }
}
