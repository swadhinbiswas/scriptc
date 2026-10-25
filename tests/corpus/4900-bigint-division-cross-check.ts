// Randomized BigInt division, remainder and multiplication checks across
// limb boundaries, with a running hash of every result.
let seed = 0x2545f491;
function next(): number {
  seed = (Math.imul(seed, 1103515245) + 12345) | 0;
  let x = seed ^ (seed >>> 15);
  x = Math.imul(x, 0x2c1b3c6d);
  return (x ^ (x >>> 12)) >>> 0;
}
function randomBig(bits: number): bigint {
  const shape = next() % 8;
  if (bits === 0) return 0n;
  const one = BigInt(bits);
  if (shape === 0) return (1n << one) - 1n;
  if (shape === 1) return 1n << (one - 1n);
  if (shape === 2) return (1n << one) - BigInt(next() % 1000) - 1n;
  let v = 0n;
  for (let i = 0; i < bits; i += 32) v = (v << 32n) | BigInt(next());
  v = v & ((1n << one) - 1n);
  if (shape === 3) v = v << BigInt(64 * (next() % 4));
  return v === 0n ? 1n : v;
}
function signed(v: bigint): bigint {
  return next() % 3 === 0 ? -v : v;
}
const M = 1000000007n;
let hash = 0n;
let checked = 0;
for (let k = 0; k < 3000; k++) {
  const a = signed(randomBig(next() % 1400));
  let b = signed(randomBig(1 + (next() % (k % 5 === 0 ? 64 : 700))));
  if (b === 0n) b = 7n;
  const q = a / b;
  const r = a % b;
  if (q * b + r !== a) throw new Error("division identity failed");
  if (r !== 0n && (r < 0n) !== (a < 0n)) throw new Error("remainder sign");
  if ((r < 0n ? -r : r) >= (b < 0n ? -b : b)) throw new Error("remainder size");
  hash = (hash * 31n + (q % M) + 3n * (r % M)) % M;
  const p = a * b;
  if (b !== 0n && p / b !== a) throw new Error("product identity failed");
  hash = (hash * 31n + (p % M)) % M;
  checked++;
}
console.log("division", checked, hash);

// Quotient-digit corrections: divisors whose top limb is 1 or all ones.
const tops = [1n, (1n << 64n) - 1n, (1n << 63n) + 1n, 1n << 63n, (1n << 32n) - 1n];
let h2 = 0n;
for (const top of tops) {
  for (let lo = 0; lo < 4; lo++) {
    const d = (top << 128n) + BigInt(lo) * 0x123456789abcdefn + 1n;
    for (let s = 0; s < 6; s++) {
      const n = d * ((1n << BigInt(64 * s + 7)) - 1n) + d - 1n;
      const q = n / d, r = n % d;
      if (q * d + r !== n || r < 0n || r >= d) throw new Error("correction case");
      h2 = (h2 * 131n + q % M + r % M) % M;
    }
  }
}
console.log("corrections", h2);
console.log("truncation", 7n / 2n, -7n / 2n, 7n / -2n, -7n / -2n, 7n % 2n, -7n % 2n, 7n % -2n, -7n % -2n);
console.log("zero results", 0n / 5n, -0n, 3n % 3n, -3n % 3n, (-1n) / 2n, 0n === -0n);
for (const f of [() => 1n / 0n, () => 5n % 0n, () => (-1n) / 0n]) {
  try {
    f();
  } catch (e) {
    console.log((e as Error).name, (e as Error).message);
  }
}
