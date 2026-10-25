// 64-bit style arithmetic with BigInt.asUintN / asIntN: hashes, generators
// and wrapping at every width, plus Number conversions.
function fnv1a(text: string): bigint {
  let h = 0xcbf29ce484222325n;
  for (let i = 0; i < text.length; i++) {
    h = BigInt.asUintN(64, (h ^ BigInt(text.charCodeAt(i))) * 0x100000001b3n);
  }
  return h;
}
let words = 0n;
for (let i = 0; i < 2000; i++) words = BigInt.asUintN(64, words + fnv1a("key-" + i * 7919));
console.log("fnv", fnv1a(""), fnv1a("a"), fnv1a("hello world"), words);

let x = 88172645463325252n;
let acc = 0n;
for (let i = 0; i < 5000; i++) {
  x = BigInt.asUintN(64, x ^ (x << 13n));
  x = x ^ (x >> 7n);
  x = BigInt.asUintN(64, x ^ (x << 17n));
  acc = BigInt.asIntN(64, acc + x);
}
console.log("xorshift", x, acc);

let m = 1n;
for (let i = 0; i < 5000; i++) m = (m * 6364136223846793005n + 1442695040888963407n) & 0xffffffffffffffffn;
console.log("lcg", m);

const samples = [0n, 1n, -1n, 127n, 128n, -128n, -129n, 255n, 256n, (1n << 63n) - 1n, 1n << 63n, -(1n << 63n), -(1n << 63n) - 1n, (1n << 64n) - 1n, 1n << 64n, -(1n << 64n), (1n << 100n) + 12345n, -((1n << 130n) + 99n)];
const widths = [0, 1, 2, 7, 8, 31, 32, 33, 52, 53, 63, 64, 65, 96, 127, 128, 129, 200];
let digest = 0n;
for (const v of samples) {
  for (const w of widths) {
    const u = BigInt.asUintN(w, v);
    const s = BigInt.asIntN(w, v);
    if (u < 0n || (w > 0 && u >= 1n << BigInt(w))) throw new Error("uint range");
    if (w > 0 && (s < -(1n << BigInt(w - 1)) || s >= 1n << BigInt(w - 1))) throw new Error("int range");
    if (w > 0 && BigInt.asUintN(w, s) !== u) throw new Error("width agreement");
    digest = (digest * 1000003n + u * 3n + s) % (1n << 61n);
  }
}
console.log("widths", digest, BigInt.asUintN(64, -1n), BigInt.asIntN(64, 1n << 63n), BigInt.asIntN(8, 255n));
try {
  BigInt.asUintN(-1, 1n);
} catch (e) {
  console.log((e as Error).name);
}
console.log("from number", BigInt(0), BigInt(-0), BigInt(2 ** 53), BigInt(-(2 ** 63)), BigInt(2 ** 64), BigInt(1e21), BigInt(Number.MAX_SAFE_INTEGER));
console.log("to number", Number(1n << 53n), Number((1n << 53n) + 1n), Number((1n << 53n) + 3n), Number((1n << 54n) + 2n), Number(-(10n ** 30n)), Number(1n << 1023n), Number(1n << 1024n), Number(((1n << 53n) - 1n) << 971n), Number((((1n << 54n) - 1n) << 970n)));
for (const v of [0.5, NaN, Infinity]) {
  try {
    BigInt(v);
  } catch (e) {
    console.log((e as Error).name, (e as Error).message);
  }
}
console.log("compare", 1n < 2, 2n > 1.5, -1n < -0.5, (1n << 64n) > 2 ** 64, (1n << 64n) === BigInt(2 ** 64), 10n ** 30n > 1e30);
