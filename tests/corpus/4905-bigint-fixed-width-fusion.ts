// Fixed-width BigInt expressions (asUintN/asIntN of arithmetic trees, and
// masks below 2^64) over small, negative and wide operands, with leaf
// evaluation order observed through side effects.
let seed = 0x1234567;
function next(): number {
  seed = (Math.imul(seed, 1103515245) + 12345) | 0;
  return (seed ^ (seed >>> 16)) >>> 0;
}
function sample(): bigint {
  const shape = next() % 6;
  const word = (BigInt(next()) << 32n) | BigInt(next());
  if (shape === 0) return word;
  if (shape === 1) return -word;
  if (shape === 2) return BigInt(next() % 100) - 50n;
  if (shape === 3) return (word << 64n) | word; // wider than 64 bits
  if (shape === 4) return -((word << 90n) + 12345n);
  return (1n << 64n) - BigInt(next() % 3); // around 2^64
}
const M = (1n << 61n) - 1n;
let digest = 0n;
function mix(v: bigint): void {
  digest = (digest * 1000003n + (v % M) + M) % M;
}
for (let k = 0; k < 4000; k++) {
  const a = sample(), b = sample(), c = sample();
  mix(BigInt.asUintN(64, a + b));
  mix(BigInt.asUintN(64, a - b * c));
  mix(BigInt.asIntN(64, a * b + c));
  mix(BigInt.asUintN(64, (a ^ b) * 0x100000001b3n));
  mix(BigInt.asUintN(64, a ^ (a << 13n)));
  mix(BigInt.asIntN(64, (a << 63n) | (b & c)));
  mix(BigInt.asUintN(32, a * a - b));
  mix(BigInt.asIntN(32, -a + ~b));
  mix(BigInt.asIntN(7, a * 3n + 1n));
  mix(BigInt.asUintN(1, a + b + c));
  mix(BigInt.asUintN(63, BigInt.asIntN(33, a * b) * BigInt.asUintN(8, c)));
  mix(BigInt.asIntN(64, BigInt.asUintN(64, a) + BigInt.asIntN(64, b)));
  mix((a * 6364136223846793005n + 1442695040888963407n) & 0xffffffffffffffffn);
  mix((a ^ b) & 0xffffn);
  mix(0xfffffffffn & (a - c));
  mix((a * b) & -1n); // not a narrowing mask
  mix((a * b) & (1n << 70n) - 1n); // wider than 64 bits
  mix(BigInt.asUintN(64, a * 0x1_0000_0000_0000_0001n)); // literal above 2^64
  mix(BigInt.asUintN(64, a << 64n)); // shift beyond the width
  mix(BigInt.asUintN(64, (a >> 3n) + b)); // right shift stays exact
  mix(BigInt.asUintN(100, a * b)); // width beyond 64
}
console.log("digest", digest);

const log: string[] = [];
function tap(name: string, v: bigint): bigint {
  log.push(name);
  return v;
}
let x = 5n;
function bump(): bigint {
  x = x + 1000n;
  return 7n;
}
const r1 = BigInt.asUintN(64, tap("a", 3n) * tap("b", 4n) + tap("c", 5n));
const r2 = BigInt.asUintN(64, x * bump() + x);
const r3 = BigInt.asIntN(64, bump() * x - x);
console.log(r1, r2, r3, x, log.join(","));

let h = 0xcbf29ce484222325n;
for (const ch of "fixed width") h = BigInt.asUintN(64, (h ^ BigInt(ch.charCodeAt(0))) * 0x100000001b3n);
console.log("fnv", h);
let s = 88172645463325252n;
let t = 0n;
for (let i = 0; i < 1000; i++) {
  s = BigInt.asUintN(64, s ^ (s << 13n));
  s = s ^ (s >> 7n);
  s = BigInt.asUintN(64, s ^ (s << 17n));
  t = BigInt.asIntN(64, t + s);
}
console.log("xorshift", s, t);
console.log("edges", BigInt.asUintN(64, -1n * 1n), BigInt.asIntN(64, (1n << 63n) + 0n), BigInt.asIntN(64, -(1n << 63n) - 1n + 0n), BigInt.asUintN(64, 0n * 5n), BigInt.asIntN(1, 1n + 0n));
