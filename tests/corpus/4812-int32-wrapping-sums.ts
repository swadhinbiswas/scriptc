// Sums and differences that only feed a ToInt32/ToUint32 conversion: int32
// and typed-array integer operands wrap in 32 bits, crossing 2^31 and -2^31;
// out-of-range reads are NaN and convert to 0; unproven operands (fractions,
// NaN, infinities, signed zero, values beyond 2^32 and 2^53) keep the exact
// double arithmetic.
function show(label: string, value: number): void {
  console.log(label, value, Object.is(value, -0) ? "negative zero" : "");
}

function bytes(n: number, seed: number): Uint8Array {
  const out = new Uint8Array(n);
  let s = seed | 0;
  for (let i = 0; i < n; i++) {
    s = (Math.imul(s, 1103515245) + 12345) | 0;
    out[i] = s >>> 24;
  }
  return out;
}

function byteSum(a: Uint8Array): number {
  let t = 2147483000;
  for (let i = 0; i < a.length; i++) t = (t + a[i]) | 0;
  return t;
}

function byteDiff(a: Uint8Array): number {
  let t = -2147483000;
  for (let i = 0; i < a.length; i++) t = (t - a[i]) | 0;
  return t;
}

function unsignedSum(a: Uint8Array): number {
  let t = 4294967000;
  for (let i = 0; i < a.length; i++) t = (t + a[i]) >>> 0;
  return t;
}

function fnv1a(a: Uint8Array): number {
  let h = 0x811c9dc5 | 0;
  for (let i = 0; i < a.length; i++) h = Math.imul(h ^ a[i], 16777619);
  return h >>> 0;
}

function djb2(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

function murmurMix(a: Uint32Array): number {
  let h = 0x9747b28c | 0;
  for (let i = 0; i < a.length; i++) {
    let k = Math.imul(a[i], 0xcc9e2d51);
    k = (k << 15) | (k >>> 17);
    h ^= Math.imul(k, 0x1b873593);
    h = (h << 13) | (h >>> 19);
    h = (Math.imul(h, 5) + 0xe6546b64) | 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h + a.length, 0x85ebca6b);
  return (h ^ (h >>> 13)) >>> 0;
}

function adler(a: Uint8Array): number {
  let s1 = 1;
  let s2 = 0;
  for (let i = 0; i < a.length; i++) {
    s1 = (s1 + a[i]) % 65521;
    s2 = (s2 + s1) % 65521;
  }
  return ((s2 << 16) | s1) >>> 0;
}

function xorshift(n: number): number {
  let x = 2463534242 | 0;
  let acc = 0;
  for (let i = 0; i < n; i++) {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    acc = ((acc + x) | 0) - (x >> 3);
    acc = (acc + i) | 0;
  }
  return acc;
}

function chain(a: number, b: number, c: number): number {
  const x = a | 0,
    y = b | 0,
    z = c | 0;
  return ((((x + y) | 0) + z) | 0) - ((x - y - z) >> 0);
}

// Reads past the end are NaN: the sum is NaN and converts to 0.
function edgeReads(a: Uint8Array, i8: Int8Array, u32: Uint32Array, i32: Int32Array): void {
  const base = 2147483647 | 0;
  for (const i of [0, 1, a.length - 1, a.length, a.length + 5, -1, 0.5]) {
    show(`u8 ${i}`, (base + a[i]) | 0);
    show(`u8- ${i}`, (base - a[i]) >> 0);
    show(`u8u ${i}`, (base + a[i] + a[i]) >>> 0);
    show(`i8 ${i}`, (-2147483648 + i8[i]) | 0);
    show(`u32 ${i}`, (u32[i] + u32[i]) | 0);
    show(`u32- ${i}`, (base - u32[i]) >>> 0);
    show(`i32 ${i}`, (i32[i] + i32[i]) | 0);
    show(`mix ${i}`, (a[i] + i8[i] - u32[i] + i32[i]) | 0);
  }
}

function codeUnits(s: string): void {
  const base = 2147483647 | 0;
  for (const i of [0, 1, s.length - 1, s.length, -1, 0.5, NaN]) {
    show(`code ${i}`, (base + s.charCodeAt(i)) | 0);
    show(`code- ${i}`, (s.charCodeAt(i) - base - s.charCodeAt(i + 1)) >>> 0);
  }
}

function unproven(x: number, y: number): void {
  const k = y | 0;
  show("x+k|0", (x + k) | 0);
  show("x-k|0", (x - k) | 0);
  show("k+x>>>0", (k + x) >>> 0);
  show("x+x>>0", (x + x) >> 0);
  show("imul", Math.imul(x + k, 3));
  show("clz", Math.clz32(x + k));
  show("not", ~(x + k));
  show("mask", (x + k) & 0xff);
  show("plain", x + k);
}

const a = bytes(4099, 7);
console.log("byteSum", byteSum(a), "byteDiff", byteDiff(a), "unsignedSum", unsignedSum(a));
console.log("fnv1a", fnv1a(a), "adler", adler(a));
console.log("djb2", djb2("the quick brown fox jumps over the lazy dog"), djb2(""), djb2("￿￿"));
const words = new Uint32Array(257);
for (let i = 0; i < words.length; i++) words[i] = (Math.imul(i, 2654435761) + i) >>> 0;
console.log("murmurMix", murmurMix(words));
console.log("xorshift", xorshift(1000));
for (const [p, q, r] of [
  [1, 2, 3],
  [2147483647, 1, 1],
  [-2147483648, -1, -1],
  [2147483647, 2147483647, 2147483647],
  [-2147483648, 2147483647, -2147483648],
]) {
  show(`chain ${p} ${q} ${r}`, chain(p, q, r));
}

const i8 = new Int8Array([-128, 127, -1, 0, 5]);
const u32 = new Uint32Array([4294967295, 2147483648, 2147483647, 0, 1]);
const i32 = new Int32Array([-2147483648, 2147483647, -1, 0, 1]);
edgeReads(new Uint8Array([255, 0, 128, 1, 254]), i8, u32, i32);

codeUnits("a\uffff\u0000z\ud83d\ude00");

show("-0+0", (-0 + 0) | 0);
show("-0-0", (-0 - 0) | 0);
show("-0+-0>>>0", (-0 + -0) >>> 0);
for (const x of [
  0,
  -0,
  0.5,
  -0.5,
  1.5,
  -2.5,
  NaN,
  Infinity,
  -Infinity,
  2147483647,
  2147483648,
  -2147483649,
  4294967295,
  4294967296,
  9007199254740991,
  9007199254740992,
  1e21,
]) {
  for (const y of [0, 1, -1, 2147483647, -2147483648]) unproven(x, y);
}
