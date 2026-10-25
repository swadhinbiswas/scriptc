// Linear congruential generators whose products exceed 2^53, reduced with
// `%` by powers of two and by other constants. The products round, so every
// step must reproduce Node's double arithmetic exactly.

let seed = 42;
function lcg31(): number {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed;
}
let prime = 42;
function parkMillerWide(): number {
  prime = (prime * 1103515245 + 12345) % 2147483647;
  return prime;
}
let word = 7;
function lcg32(): number {
  word = (word * 6364136223846793 + 1442695040888963) % 2 ** 32;
  return word;
}
let negative = -99;
function signedStep(): number {
  negative = (negative * -1103515245 - 12345) % 2147483648;
  return negative;
}

const seen = new Map<number, number>();
let a = 0;
let b = 0;
let c = 0;
let d = 0;
for (let i = 0; i < 20000; i++) {
  const x = lcg31();
  a = (a + x) % 1000000007;
  b = (b * 31 + parkMillerWide()) % 1000000007;
  c = (c + lcg32()) % 2 ** 40;
  d = (d + signedStep()) % 1000000007;
  if (i < 8) console.log(i, x, prime, word, negative);
  seen.set(x, (seen.get(x) ?? 0) + 1);
}
console.log("sums", a, b, c, d, Object.is(d, -0));
console.log("distinct", seen.size);

// Bucket a stream into a small table with the low and high bits.
const buckets = new Int32Array(16);
for (let i = 0; i < 5000; i++) {
  const x = lcg31();
  buckets[x % 16]++;
  buckets[Math.floor(x / 134217728) % 16]++;
}
console.log(Array.from(buckets).join(","));
