// ToInt32/ToUint32 of doubles beyond 2^53, NaN and the infinities (the slow
// path of every bitwise operator and integer typed-array store), and int32
// loop counters written `i = (i + 1) | 0`, whose values convert back and
// forth between integers and doubles.

const big: number[] = [
  2 ** 53 + 2,
  -(2 ** 53 + 2),
  2 ** 53 + 4,
  2 ** 53 * 3 + 6,
  2 ** 54 + 4,
  -(2 ** 54 + 12),
  2 ** 60 + 2 ** 33 + 2 ** 12,
  -(2 ** 60 + 2 ** 31 + 2 ** 9),
  2 ** 62 + 2 ** 31,
  2 ** 63,
  -(2 ** 63),
  2 ** 63 + 2 ** 11,
  2 ** 64 - 2 ** 11,
  2 ** 64,
  2 ** 64 + 2 ** 12,
  -(2 ** 64 + 2 ** 12),
  2 ** 84 + 2 ** 33,
  2 ** 85 + 2 ** 33,
  2 ** 1023,
  1.7976931348623157e308,
  -1.7976931348623157e308,
  1e21,
  -1e21,
  123456789012345680000,
  0 / 0,
  1 / 0,
  -1 / 0,
];

function show(label: string, value: number): string {
  return `${label}=${value}`;
}

for (const x of big) {
  const parts = [
    show("|0", x | 0),
    show(">>>0", x >>> 0),
    show("~", ~x),
    show("&ffff", x & 0xffff),
    show("^1", x ^ 1),
    show("<<1", x << 1),
    show(">>1", x >> 1),
    show(">>>1", x >>> 1),
    show("1<<x", 1 << x),
  ];
  console.log(String(x), parts.join(" "));
}

// Integer typed-array stores convert with ToUint32 (modulo the element width).
const i32 = new Int32Array(big.length);
const u32 = new Uint32Array(big.length);
const u16 = new Uint16Array(big.length);
const i8 = new Int8Array(big.length);
for (let i = 0; i < big.length; i++) {
  const x = big[i]!;
  i32[i] = x;
  u32[i] = x;
  u16[i] = x;
  i8[i] = x;
}
console.log("Int32Array", Array.from(i32).join(","));
console.log("Uint32Array", Array.from(u32).join(","));
console.log("Uint16Array", Array.from(u16).join(","));
console.log("Int8Array", Array.from(i8).join(","));

// Values computed at run time, so no conversion folds at compile time.
let seed = 7;
function next(): number {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed;
}
let mixed = 0;
for (let k = 0; k < 200; k++) {
  const scale = 2 ** (53 + (next() % 40));
  const value = (next() + 1) * scale * (next() % 2 === 0 ? 1 : -1);
  mixed = (mixed + (value | 0) + (value >>> 0) + (value >> 3)) | 0;
}
console.log("mixed", mixed);

// int32 counters: the loop variable converts to a double for every number use.
function sumCounters(start: number, end: number): number {
  let sum = 0;
  for (let i = start | 0; i < end; i = (i + 1) | 0) sum += i * 0.5;
  return sum;
}
console.log("counters", sumCounters(0, 1000), sumCounters(-500, 500), sumCounters(2147483000, 2147483647));

function scanUntil(units: Uint16Array, pos: number, stop: number): number {
  let i = pos | 0;
  while (i < units.length && (units[i] | 0) !== stop) i = (i + 1) | 0;
  return i;
}
const units = new Uint16Array(64);
for (let i = 0; i < units.length; i++) units[i] = 97 + (i % 26);
console.log("scan", scanUntil(units, 0, 122), scanUntil(units, 26, 122), scanUntil(units, 60, 0));

// A counter that wraps at 2^31: its increment is not an int32, so it stays a
// double until `| 0` wraps it.
const wrapped: number[] = [];
let w = 2147483645;
for (let n = 0; n < 6; n++) {
  wrapped.push(w);
  w = (w + 1) | 0;
}
console.log("wrap", wrapped.join(","));

// An index that goes negative: integer reads past either end stay undefined.
const small = new Uint16Array([10, 20, 30]);
const reads: string[] = [];
for (let i = -2; i < 5; i = (i + 1) | 0) reads.push(String(small[i]));
console.log("reads", reads.join(","));
