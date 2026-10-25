// Number locals whose every write is an int32 (or every write a uint32):
// string and byte hashes, checksums and PRNGs, counters that cross 2^31
// through `| 0`, uint32 accumulators above 2^31, ++/-- counters, Int32
// contract locals and parameters. Locals that also hold fractions, -0, NaN
// or values beyond 32 bits, and locals that closures capture or that live
// in generator and async frames, read back the same numbers.
import type { Int32 } from "@scriptc/types";

function show(label: string, value: number): void {
  console.log(label, value, Object.is(value, -0) ? "negative zero" : "");
}

function words(n: number): string[] {
  const out: string[] = [];
  let s = 12345;
  for (let i = 0; i < n; i++) {
    s = (Math.imul(s, 1103515245) + 12345) | 0;
    const len = 1 + ((s >>> 16) & 15);
    let w = "";
    for (let j = 0; j < len; j++) {
      s = (Math.imul(s, 1103515245) + 12345) | 0;
      w += String.fromCharCode(97 + ((s >>> 16) % 26));
    }
    out.push(w);
  }
  out.push("", "é漢字🙂", "x".repeat(300));
  return out;
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

// String hashes, as a hash table or an interner computes them.
function djb2(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h;
}
function javaHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}
function sdbm(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (s.charCodeAt(i) + (h << 6) + (h << 16) - h) | 0;
  return h;
}
function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

// Checksums over bytes.
function rsyncWeak(a: Uint8Array): number {
  let s1 = 0,
    s2 = 0;
  for (let i = 0; i < a.length; i++) {
    s1 = (s1 + a[i]) & 0xffff;
    s2 = (s2 + s1) & 0xffff;
  }
  return ((s2 << 16) | s1) >>> 0;
}
function rolling(a: Uint8Array, window: number): number {
  // rsync's rolling update: drop the leaving byte, add the entering one.
  let s1 = 0,
    s2 = 0,
    best = 0;
  for (let i = 0; i < window; i++) {
    s1 = (s1 + a[i]) & 0xffff;
    s2 = (s2 + s1) & 0xffff;
  }
  for (let i = window; i < a.length; i++) {
    s1 = (s1 - a[i - window] + a[i]) & 0xffff;
    s2 = (s2 - window * a[i - window] + s1) & 0xffff;
    const digest = ((s2 << 16) | s1) >>> 0;
    if (digest > best) best = digest;
  }
  return best;
}
function fletcherWrap(a: Uint8Array): number {
  let s1 = 0,
    s2 = 0;
  for (let i = 0; i < a.length; i++) {
    s1 = (s1 + a[i]) | 0;
    s2 = (s2 + s1) | 0;
  }
  return (s1 ^ s2) >>> 0;
}
function adler32(a: Uint8Array): number {
  // `%` results stay ordinary numbers.
  let x = 1,
    y = 0;
  for (let i = 0; i < a.length; i++) {
    x = (x + a[i]) % 65521;
    y = (y + x) % 65521;
  }
  return ((y << 16) | x) >>> 0;
}
function murmur3(a: Uint8Array, seed: number): number {
  let h = seed | 0;
  const n = a.length & ~3;
  for (let i = 0; i < n; i += 4) {
    let k = a[i] | (a[i + 1] << 8) | (a[i + 2] << 16) | (a[i + 3] << 24);
    k = Math.imul(k, 0xcc9e2d51);
    k = (k << 15) | (k >>> 17);
    k = Math.imul(k, 0x1b873593);
    h ^= k;
    h = (h << 13) | (h >>> 19);
    h = (Math.imul(h, 5) + 0xe6546b64) | 0;
  }
  h ^= a.length;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}
function inet(a: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i + 1 < a.length; i += 2) sum = (sum + ((a[i] << 8) | a[i + 1])) >>> 0;
  while (sum >>> 16) sum = ((sum & 0xffff) + (sum >>> 16)) >>> 0;
  return ~sum & 0xffff;
}

// PRNGs.
function xorshift32(seed: number, n: number): number {
  let x = seed | 0,
    acc = 0;
  for (let i = 0; i < n; i++) {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    acc = (acc + (x >>> 0)) >>> 0;
  }
  return acc;
}
function sfc32(a: number, b: number, c: number, d: number, n: number): number {
  let total = 0;
  for (let i = 0; i < n; i++) {
    a |= 0;
    b |= 0;
    c |= 0;
    d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    total = (total + (t >>> 0)) >>> 0;
  }
  return total;
}
function mulberry32(seed: number): () => number {
  // The state is captured by the generator closure.
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Counters crossing 2^31 through `| 0`, and uint32 counters above 2^31.
function wrapping(): void {
  let c = 2147483645;
  const seen: number[] = [];
  for (let i = 0; i < 5; i++) {
    c = (c + 1) | 0;
    seen.push(c);
  }
  console.log("wrap up", seen.join(" "));
  let d = -2147483646;
  seen.length = 0;
  for (let i = 0; i < 4; i++) {
    d = (d - 1) | 0;
    seen.push(d);
  }
  console.log("wrap down", seen.join(" "));
  let u = 4294967290;
  seen.length = 0;
  for (let i = 0; i < 8; i++) {
    u = (u + 1) >>> 0;
    seen.push(u);
  }
  console.log("uint32 wrap", seen.join(" "));
  let big = 0;
  for (let i = 0; i < 40; i++) big = (big + 0x7654321f) >>> 0;
  show("uint32 big", big);
  show("uint32 half", big / 2);
  show("uint32 string", Number(String(big)));
}

// ++ and -- on int32 counters, read as values.
function counters(limit: number): void {
  let up = 0,
    down = 10;
  const log: string[] = [];
  for (let i = 0; i < 3; i++) {
    const before = up++;
    const after = ++up;
    log.push(`${before}/${after}`);
  }
  while (down > 6) log.push(String(down--));
  let k = 0;
  while (k < (limit | 0)) k++;
  log.push(String(--k), String(k));
  console.log("counters", log.join(" "));
}

// Locals that leave int32 keep their exact values.
function leaves(n: number): void {
  let h = 0;
  for (let i = 0; i < n; i++) h = (h + i) | 0;
  h = h * 1.5;
  show("fraction", h);
  let z = 7 | 0;
  if (n > 0) z = -0;
  show("negative zero", z);
  let m = 5 | 0;
  for (let i = 0; i < n; i++) m = m % 2 === 0 ? m >>> 0 : m | 0;
  show("mixed", m);
  let both = -1 | 0;
  if (n > 2) both = both >>> 0;
  show("signed then unsigned", both);
  let wide = 1 | 0;
  for (let i = 0; i < 40; i++) wide = wide * 2;
  show("past 2^32", wide);
  let nan = 3 | 0;
  if (n > 1) nan = (nan * 0) / 0;
  show("nan", nan);
  let divided = 1 | 0;
  divided = (divided / 3) | 0;
  show("divided", 1 / (divided - 0));
}

// Captured accumulators: the closure and the function share one binding.
function captured(list: string[]): void {
  let h = 17;
  const mixIn = (s: string): void => {
    for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  };
  for (const w of list) mixIn(w);
  let count = 0;
  const bump = (): number => ++count;
  for (let i = 0; i < 5; i++) bump();
  const reads: (() => number)[] = [];
  for (let i = 0; i < 3; i++) {
    let local = (i * 7) | 0;
    reads.push(() => local);
    local = (local + 1) | 0;
  }
  console.log("captured", h, count, reads.map((r) => r()).join(" "));
}

// Generators and async functions keep their locals in frames.
function* hashes(list: string[]): Generator<number> {
  let h = 0;
  for (const w of list) {
    for (let i = 0; i < w.length; i++) h = (Math.imul(h, 33) ^ w.charCodeAt(i)) | 0;
    yield h;
  }
}
async function asyncSum(list: string[]): Promise<number> {
  let total = 0;
  for (const w of list) {
    await Promise.resolve();
    total = (total + djb2(w)) | 0;
  }
  return total;
}

// Int32 contract locals and parameters.
function contract(seed: Int32, steps: Int32): Int32 {
  let acc: Int32 = seed;
  for (let i: Int32 = 0; i < steps; i = (i + 1) | 0) acc = (Math.imul(acc, 3) + i) | 0;
  return acc;
}

const list = words(400);
let a = 0,
  b = 0,
  c = 0,
  d = 0;
for (const w of list) {
  a = (a + djb2(w)) | 0;
  b = (b ^ javaHash(w)) | 0;
  c = (c + sdbm(w)) | 0;
  d = (d ^ fnv1a(w)) >>> 0;
}
console.log("string hashes", a, b, c, d);
console.log("samples", djb2("hello"), javaHash("hello"), sdbm("hello"), fnv1a("hello"));
console.log("empty", djb2(""), javaHash(""), sdbm(""), fnv1a(""));

const data = bytes(1 << 14, 7);
console.log("rsync", rsyncWeak(data), rolling(data, 64));
console.log("fletcher", fletcherWrap(data), "adler32", adler32(data));
console.log("murmur3", murmur3(data, 0), murmur3(data, -1), murmur3(data.subarray(0, 7), 42));
console.log("inet", inet(data), inet(new Uint8Array([0xff, 0xff, 0xff, 0xff, 0x01])));

console.log("xorshift32", xorshift32(2463534242, 1000), xorshift32(1, 1));
console.log("sfc32", sfc32(1, 2, 3, 4, 10000), sfc32(-1, 0x7fffffff, -2147483648, 0, 3));
const next = mulberry32(42);
const draws: string[] = [];
for (let i = 0; i < 4; i++) draws.push(next().toFixed(6));
console.log("mulberry32", draws.join(" "));

wrapping();
counters(5);
leaves(4);
leaves(0);
captured(list.slice(0, 50));
console.log("generator", [...hashes(["ab", "cd", "efg"])].join(" "));
console.log("contract", contract(7, 20), contract(-2147483648, 3));
asyncSum(list).then((total) => console.log("async", total));
