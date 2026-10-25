// Large products, squares, powers, shifts and bitwise operators on
// multi-thousand-bit values, checked through independent identities.
let seed = 12345;
function next(): number {
  seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
  return seed >>> 0;
}
function randomBig(words: number): bigint {
  let v = 1n;
  for (let i = 0; i < words; i++) v = (v << 32n) | BigInt(next());
  return v;
}
const M = (1n << 89n) - 1n;
let digest = 0n;
for (const words of [1, 2, 3, 40, 79, 80, 81, 160, 161, 333, 700]) {
  const a = randomBig(words);
  const b = randomBig(words + (next() % 7));
  const c = randomBig(Math.max(1, words >> 1));
  const ab = a * b;
  if ((a + c) * b !== ab + c * b) throw new Error("distributive");
  if (a * a !== a ** 2n) throw new Error("square");
  if ((a + b) * (a - b) !== a * a - b * b) throw new Error("difference of squares");
  if (ab / b !== a || ab % a !== 0n) throw new Error("exact division");
  const shifted = (a << 1000n) >> 1000n;
  if (shifted !== a) throw new Error("shift round trip");
  if (((a & b) | (a ^ b)) !== (a | b)) throw new Error("bit identity");
  if ((-a & b) + (-a | b) !== -a + b) throw new Error("negative bit identity");
  if (~a !== -a - 1n || ~-a !== a - 1n) throw new Error("not");
  if (-a >> 3n !== -((a + 7n) / 8n)) throw new Error("floor shift");
  digest = (digest * 1000003n + (ab % M) + ((a * a) % M) + ((-a ^ c) % M)) % M;
}
console.log("products", digest);
console.log("powers", (3n ** 500n) % M, (-2n) ** 63n, (-2n) ** 64n, (-1n) ** 1001n, 0n ** 0n, 1n ** (10n ** 30n), 2n ** 100n);
let f = 1n;
for (let i = 2; i <= 3000; i++) f *= BigInt(i);
console.log("3000!", f.toString().length, f % M, f.toString(36).slice(0, 16));
let fa = 0n, fb = 1n;
for (let i = 0; i < 5000; i++) {
  const t = fa + fb;
  fa = fb;
  fb = t;
}
console.log("fib5000", fa.toString().length, fa.toString().slice(-20));
function modpow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = 1n;
  base %= mod;
  while (exp > 0n) {
    if ((exp & 1n) === 1n) result = (result * base) % mod;
    base = (base * base) % mod;
    exp >>= 1n;
  }
  return result;
}
const p = 2n ** 521n - 1n; // a Mersenne prime
console.log("fermat", modpow(3n, p - 1n, p), modpow(12345678901234567890n, p - 2n, p) * 12345678901234567890n % p);
try {
  console.log(1n << (1n << 40n));
} catch (e) {
  console.log((e as Error).name, (e as Error).message);
}
try {
  console.log(2n ** (2n ** 40n));
} catch (e) {
  console.log((e as Error).name, (e as Error).message);
}
console.log("huge right shifts", (1n << 300n) >> (1n << 70n), -(1n << 300n) >> (1n << 70n), 0n << (1n << 70n));
