// Pure number recursion: results inside the int32 range, results that
// leave it, results past 2^53 (where doubles lose precision), and
// arguments that are negative, fractional, -0 or NaN.

function fib(n: number): number {
  if (n < 2) return n;
  return fib(n - 1) + fib(n - 2);
}

// Leaves near the int32 limit: fibBig(3) already exceeds it.
function fibBig(n: number): number {
  return n < 2 ? 1000000000 + n : fibBig(n - 1) + fibBig(n - 2);
}

// An accumulating self call whose partial sums leave the int32 range and
// later pass 2^53.
function doubling(n: number, k: number): number {
  if (n === 0) return 0;
  return k + doubling(n - 1, k * 2);
}

// Tail call with a growing parameter (int32, then past 2^53).
function grow(n: number, x: number): number {
  return n === 0 ? x : grow(n - 1, x * 3 + 1);
}

// The accumulated term on the left of the self call.
function sumTo(n: number): number {
  return n <= 0 ? 0 : sumTo(n - 1) + n;
}

// Subtraction, remainder, bitwise operators and -0 results.
function mix(n: number, m: number): number {
  if (n <= 0) return n % m;
  const half = n >> 1;
  const low = n & 1;
  return mix(half, m) * 2 - low + (n ^ m) % 7;
}
function negate(n: number): number {
  return n === 0 ? -n : negate(n - 1);
}
function times(n: number, k: number): number {
  return n === 0 ? k * 0 : times(n - 1, k);
}
function unsigned(n: number): number {
  return n === 0 ? -1 >>> 0 : unsigned(n - 1);
}
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

const out: string[] = [];
for (let n = -3; n <= 30; n++) out.push(String(fib(n)));
console.log(out.join(" "));
console.log(fib(2.5), fib(10.5), fib(-0), Object.is(fib(-0), -0), fib(-7.25));
try {
  console.log(fib(Infinity - Infinity));
} catch (e) {
  console.log("NaN:", e instanceof RangeError, (e as Error).message);
}
for (let n = 0; n <= 12; n++) console.log("fibBig", n, fibBig(n));
for (const n of [1, 10, 30, 31, 32, 33, 52, 53, 54, 60, 70]) console.log("doubling", n, doubling(n, 3));
for (const n of [0, 5, 19, 20, 21, 33, 34, 35, 40]) console.log("grow", n, grow(n, 1));
for (const n of [-5, 0, 1, 100, 5000]) console.log("sumTo", n, sumTo(n));
for (const [n, m] of [
  [0, 3],
  [-4, 2],
  [-5, 3],
  [9, 5],
  [1000, 13],
  [123456, 0],
  [2147483647, 1],
  [-2147483648, -1],
]) {
  console.log("mix", n, m, mix(n, m), Object.is(mix(n, m), -0));
}
console.log(negate(3), Object.is(negate(3), -0), times(4, -2), Object.is(times(4, -2), -0));
console.log(times(2, 5), unsigned(2), gcd(1071, 462), gcd(-48, 18), gcd(7.5, 2.5));
let acc = 0;
for (let i = 0; i < 6; i++) acc += fib(15 + i);
console.log(acc);
console.log([3, 4, 5].map(fib).join(","));
