// Small-value BigInt operator trees: sums, products, quotients, remainders,
// shifts and negation around the 64-bit boundary, mixed signs, Number
// operands, and the errors such trees can raise.
let seed = 0x9e3779b9;
function next(): number {
  seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
  return seed >>> 0;
}
function sample(): bigint {
  const shape = next() % 8;
  const word = (BigInt(next()) << 32n) | BigInt(next());
  if (shape === 0) return word;
  if (shape === 1) return -word;
  if (shape === 2) return BigInt(next() % 2000) - 1000n;
  if (shape === 3) return (1n << 64n) - 1n - BigInt(next() % 4);
  if (shape === 4) return -((1n << 64n) - 1n - BigInt(next() % 4));
  if (shape === 5) return (1n << 63n) + BigInt(next() % 3) - 1n;
  if (shape === 6) return word << 40n; // wider than 64 bits
  return BigInt(next() % 7);
}
const M = (1n << 61n) - 1n;
let digest = 0n;
let errors = 0;
function mix(v: bigint): void {
  digest = (digest * 1000003n + (v % M) + M) % M;
}
for (let k = 0; k < 5000; k++) {
  const a = sample(), b = sample(), c = sample();
  const n = (next() % 20000) - 10000;
  mix(a + b + c);
  mix(a - b - c);
  mix(a * b + c);
  mix((a + b) * c);
  mix(a * 3n - b * 5n);
  mix(-a + b);
  mix(~a + c);
  mix((a >> 3n) + (b << 2n));
  mix((a >> 63n) - (b >> 1n));
  mix((a << 63n) + 1n);
  mix(a + BigInt(n));
  mix(BigInt(n) * a - 7n);
  mix((a & b) + (a | c));
  mix((a ^ b) - c);
  mix(BigInt.asUintN(64, a) + 1n);
  mix(BigInt.asIntN(64, a * b) / 3n);
  mix(BigInt.asUintN(32, a) * BigInt.asIntN(16, b));
  try {
    mix(a / b + c % b);
  } catch (e) {
    errors++;
  }
  try {
    mix((a + 1n) % (c - c + b));
  } catch (e) {
    errors++;
  }
}
console.log("trees", digest, errors);

const min = -(1n << 63n);
console.log("boundaries", min / -1n + 0n, min % -1n + 0n, (1n << 63n) * 2n - 1n, ((1n << 64n) - 1n) + 1n - 1n, -((1n << 64n) - 1n) - 1n + 1n);
console.log("floors", -7n >> 1n, (-8n >> 3n) + 0n, (-1n >> 60n) - 0n, (-(1n << 64n) + 1n) >> 1n, -5n / 2n + -5n % 2n);
let counter = 0n;
let total = 0n;
for (let i = 0; i < 100000; i++) {
  counter = counter + 1n;
  total = total + BigInt(i & 1023) * 3n;
}
console.log("loops", counter, total);
for (const v of [0.5, NaN, -Infinity, 2 ** 64, -(2 ** 64), -0]) {
  try {
    console.log("number", v, 10n + BigInt(v) * 2n);
  } catch (e) {
    console.log("number", v, (e as Error).name, (e as Error).message);
  }
}
const order: string[] = [];
function side(name: string, v: bigint): bigint {
  order.push(name);
  return v;
}
try {
  console.log(side("a", 6n) / side("b", 0n) + side("c", 1n));
} catch (e) {
  console.log("order", (e as Error).name, order.join(","));
}
let x = 3n;
try {
  console.log(x / 0n + x * 2n);
} catch (e) {
  console.log("zero", (e as Error).message);
}
