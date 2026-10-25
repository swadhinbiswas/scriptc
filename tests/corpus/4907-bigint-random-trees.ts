// Generated BigInt operator trees (sums, products, quotients, bitwise operators,
// shifts, negation, BigInt(number) operands and asIntN/asUintN) evaluated over
// operands around the 64-bit boundary; errors are folded into the digest.
let seed = 77;
function next(): number { seed = (Math.imul(seed, 1664525) + 1013904223) | 0; return seed >>> 0; }
function sample(): bigint {
  const s = next() % 7; const w = (BigInt(next()) << 32n) | BigInt(next());
  if (s === 0) return w; if (s === 1) return -w; if (s === 2) return BigInt(next() % 200) - 100n;
  if (s === 3) return (1n << 64n) - 1n - BigInt(next() % 3); if (s === 4) return -(1n << 63n) + BigInt(next() % 3) - 1n;
  if (s === 5) return w << 50n; return 0n;
}
const M = (1n << 61n) - 1n;
let digest = 0n; let errs = 0;
function mix(v: bigint): void { digest = (digest * 1000003n + (v % M) + M) % M; }
function f0(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return BigInt((n * 3)); }
function f1(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return 1n; }
function f2(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return ((BigInt.asUintN(32, (6364136223846793005n / BigInt(n))) ^ (BigInt.asUintN(64, b) >> 33n)) | b); }
function f3(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return BigInt((n * 3)); }
function f4(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return (0x7fffffffffffffffn | ((BigInt(n) << 100n) % ((BigInt((n & 1023)) >> 64n) ^ BigInt((n & 1023))))); }
function f5(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return ((((12345678901234567890123n & BigInt((n & 1023))) / -1n) ^ c) & (b - (a * (~(0x1_0000_0000_0000_0001n))))); }
function f6(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return (~(BigInt.asUintN(32, (BigInt((n * 3)) / (BigInt(n) << 1n))))); }
function f7(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return a; }
function f8(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return ((-((a - 0x100000001b3n))) / b); }
function f9(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return 12345678901234567890123n; }
function f10(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return (BigInt(m) % BigInt((n & 1023))); }
function f11(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return (BigInt((n * 3)) + (((BigInt((n & 1023)) - b) % BigInt.asUintN(32, BigInt(m))) | (BigInt.asUintN(31, c) << 100n))); }
function f12(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return (0n * (c % 0x7fffffffffffffffn)); }
function f13(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return a; }
function f14(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return ((BigInt((n & 1023)) << 63n) | ((12345678901234567890123n & a) - ((b & b) - (c + b)))); }
function f15(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return BigInt.asUintN(64, 3n); }
function f16(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return b; }
function f17(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return (((BigInt(n) & (3n >> 64n)) * (b % (c - 0x100000001b3n))) % (((a - 0n) >> 1n) / BigInt.asUintN(33, a))); }
function f18(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return (BigInt.asUintN(7, (BigInt.asUintN(16, 0x100000001b3n) >> 7n)) | (BigInt.asUintN(53, (c << 100n)) ^ ((BigInt((n & 1023)) >> 0n) & (~(c))))); }
function f19(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return ((((b | 12345678901234567890123n) >> 63n) | ((3n / b) + (7n << 63n))) * ((BigInt((n & 1023)) ^ (a * BigInt(m))) | a)); }
function f20(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return ((-(((-(b)) | (-(1n))))) >> 0n); }
function f21(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return (b << 1n); }
function f22(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return b; }
function f23(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return BigInt.asUintN(32, (BigInt.asIntN(32, (b % c)) * ((c / -1n) - BigInt.asUintN(53, a)))); }
function f24(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return b; }
function f25(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return ((((c % c) * BigInt.asIntN(33, a)) % ((b - BigInt((n * 3))) % (12345678901234567890123n >> 64n))) / (BigInt(n) / ((b % 0n) * (0xffffffffffffffffn | 7n)))); }
function f26(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return (BigInt.asUintN(33, a) >> 64n); }
function f27(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return ((b % ((BigInt((n & 1023)) & a) | (255n & c))) ^ b); }
function f28(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return (BigInt.asIntN(32, ((0x1_0000_0000_0000_0001n << 1n) | (a + c))) - ((BigInt.asUintN(8, BigInt(n)) % BigInt.asUintN(33, 0xffffffffffffffffn)) & 1n)); }
function f29(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return a; }
function f30(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return BigInt.asUintN(16, ((BigInt.asIntN(31, 0x7fffffffffffffffn) / (BigInt(m) % c)) * (-((c | c))))); }
function f31(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return (0n ^ b); }
function f32(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return c; }
function f33(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return BigInt.asUintN(16, (((255n * 0x1_0000_0000_0000_0001n) & (BigInt((n & 1023)) - c)) - ((a | c) / BigInt.asUintN(31, 1n)))); }
function f34(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return (~((((a ^ c) * 12345678901234567890123n) >> 0n))); }
function f35(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return (b + (BigInt.asUintN(33, a) & BigInt.asUintN(8, (-1n / c)))); }
function f36(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return ((((b ^ BigInt(n)) % (c * b)) ^ ((255n / b) >> 7n)) / (6364136223846793005n ^ (BigInt.asIntN(1, 12345678901234567890123n) & (b * c)))); }
function f37(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return (b & (-(((a % 0x100000001b3n) + BigInt.asIntN(8, b))))); }
function f38(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return (BigInt.asUintN(16, c) % (~((b - BigInt.asUintN(31, 3n))))); }
function f39(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return c; }
function f40(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return BigInt(m); }
function f41(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return c; }
function f42(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return ((c & BigInt.asUintN(53, (b ^ 7n))) << 31n); }
function f43(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return ((BigInt.asIntN(53, (6364136223846793005n ^ 3n)) & ((BigInt((n & 1023)) % BigInt(n)) + (BigInt(n) << 32n))) << 32n); }
function f44(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return ((((BigInt(m) & a) & (c % c)) - c) / (BigInt.asIntN(31, (c | 0x7fffffffffffffffn)) + b)); }
function f45(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return a; }
function f46(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return (BigInt.asUintN(8, ((b - b) ^ BigInt.asUintN(32, c))) ^ BigInt.asUintN(8, ((c & BigInt((n & 1023))) >> 7n))); }
function f47(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return BigInt.asIntN(63, (((a & b) * BigInt.asIntN(53, a)) >> 0n)); }
function f48(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return (b | (BigInt.asUintN(1, (7n ^ a)) % ((0x7fffffffffffffffn >> 64n) & (3n % c)))); }
function f49(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return ((BigInt(m) ^ (-(-1n))) & b); }
function f50(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return ((-((b ^ (a | c)))) & ((0x100000001b3n | (BigInt((n * 3)) + a)) & (a ^ (c - a)))); }
function f51(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return (~(BigInt.asIntN(1, a))); }
function f52(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return (((-(0xffffffffffffffffn)) ^ 1n) & (BigInt.asIntN(7, (c | c)) - ((c * a) & (BigInt((n & 1023)) * a)))); }
function f53(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return ((c - (-((0n >> 63n)))) << 64n); }
function f54(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return (~((BigInt(n) >> 1n))); }
function f55(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return ((BigInt.asUintN(31, (b ^ 6364136223846793005n)) + a) ^ BigInt(m)); }
function f56(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return BigInt.asIntN(32, ((a / BigInt.asIntN(7, 0xffffffffffffffffn)) << 63n)); }
function f57(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return (BigInt.asUintN(32, ((BigInt(m) ^ b) - (b + b))) ^ (BigInt.asIntN(7, BigInt.asUintN(33, a)) & c)); }
function f58(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return ((BigInt(n) / BigInt((n & 1023))) | c); }
function f59(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return (-((3n & (BigInt.asUintN(31, a) ^ c)))); }
function f60(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return (~((BigInt((n * 3)) * c))); }
function f61(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return BigInt.asUintN(7, (((6364136223846793005n + a) << 64n) + (c * (0x7fffffffffffffffn + b)))); }
function f62(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return ((((a % 6364136223846793005n) | BigInt.asIntN(33, BigInt((n * 3)))) ^ BigInt.asUintN(8, (c << 64n))) ^ (((BigInt(n) + a) - 0xffffffffffffffffn) >> 1n)); }
function f63(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return (((a + 1n) >> 64n) % BigInt.asUintN(33, BigInt.asIntN(31, (c ^ b)))); }
function f64(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return a; }
function f65(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return ((((7n | BigInt(n)) * b) - c) % (((BigInt((n * 3)) << 64n) * b) - (BigInt.asIntN(64, BigInt(m)) % (255n >> 33n)))); }
function f66(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return BigInt.asIntN(7, (BigInt.asIntN(33, BigInt.asUintN(32, 255n)) - BigInt.asUintN(31, (1n >> 63n)))); }
function f67(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return (a / (BigInt.asUintN(64, a) + ((a | a) % BigInt((n * 3))))); }
function f68(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return (b % BigInt.asIntN(1, (c | (b ^ a)))); }
function f69(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return (b >> 1n); }
function f70(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return (~(c)); }
function f71(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return (7n - BigInt.asUintN(33, (BigInt.asUintN(8, c) * (c & a)))); }
function f72(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return c; }
function f73(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return a; }
function f74(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return a; }
function f75(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return (0x7fffffffffffffffn - (b >> 33n)); }
function f76(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return (BigInt.asUintN(1, ((a % BigInt((n & 1023))) / 1n)) >> 33n); }
function f77(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return BigInt.asUintN(8, BigInt.asIntN(31, BigInt((n & 1023)))); }
function f78(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return ((((a + b) + (0x100000001b3n | -0x8000000000000000n)) + ((c & -1n) / (BigInt((n & 1023)) / c))) + ((6364136223846793005n + BigInt((n * 3))) >> 1n)); }
function f79(a: bigint, b: bigint, c: bigint, n: number, m: number): bigint { return b; }
for (let k = 0; k < 150; k++) {
  const a = sample(), b = sample(), c = sample();
  const n = (next() % 4001) - 2000; const m = k % 9 === 0 ? 0.5 : k % 11 === 0 ? 2 ** 70 : (next() % 99) - 50;
  try { mix(f0(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f1(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f2(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f3(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f4(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f5(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f6(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f7(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f8(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f9(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f10(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f11(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f12(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f13(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f14(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f15(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f16(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f17(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f18(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f19(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f20(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f21(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f22(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f23(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f24(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f25(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f26(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f27(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f28(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f29(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f30(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f31(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f32(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f33(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f34(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f35(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f36(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f37(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f38(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f39(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f40(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f41(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f42(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f43(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f44(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f45(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f46(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f47(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f48(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f49(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f50(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f51(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f52(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f53(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f54(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f55(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f56(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f57(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f58(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f59(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f60(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f61(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f62(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f63(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f64(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f65(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f66(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f67(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f68(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f69(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f70(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f71(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f72(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f73(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f74(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f75(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f76(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f77(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f78(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
  try { mix(f79(a, b, c, n, m)); } catch (e) { errs++; mix(BigInt((e as Error).message.length)); }
}
console.log(digest, errs);
