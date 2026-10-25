// Compound assignment and increment/decrement on bigint locals and fields.
let a = 1n;
for (let i = 0; i < 10; i++) {
  a += 3n;
  a *= 2n;
  a++;
}
let b = 5n;
b--;
b **= 3n;
b %= 7n;
b <<= 70n;
b ^= 1n;
b |= 64n;
b &= (1n << 72n) - 1n;
b >>= 1n;
b -= 100n;
b /= 3n;
const pre = ++b;
const post = b++;
console.log(a, b, pre, post, --a, a--, a);

class Totals {
  sum = 0n;
  count = 0n;
}
const t = new Totals();
for (let i = 1; i <= 50; i++) {
  t.sum += BigInt(i) ** 5n;
  t.count++;
}
--t.count;
console.log(t.sum, t.count);

const state: { h: bigint } = { h: 0xcbf29ce484222325n };
for (const c of "compound assignment") {
  state.h ^= BigInt(c.charCodeAt(0));
  state.h *= 0x100000001b3n;
  state.h = BigInt.asUintN(64, state.h);
}
console.log(state.h);

let big = 1n;
for (let i = 1; i <= 200; i++) big *= BigInt(i);
let digits = 0;
while (big > 0n) {
  big /= 10n;
  digits++;
}
console.log("200! digits", digits);

let n = -1n;
n **= 3n;
n -= -1n;
console.log(n, n === 0n);
try {
  let z = 1n;
  z /= 0n;
} catch (e) {
  console.log((e as Error).name, (e as Error).message);
}
try {
  let z = 2n;
  z **= -1n;
} catch (e) {
  console.log((e as Error).name);
}
