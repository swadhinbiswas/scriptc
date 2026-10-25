// TypedArray sort and toSorted with comparators: recognized numeric
// comparators, NaN and -0 under them, inconsistent comparators, call
// counts, receiver writes, exceptions, and short parameter lists all match
// Node's comparison schedule.
let seed = 23;
function random(): number {
  seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
  return seed / 4294967296;
}

function show(values: number[]): string {
  return values.map((v) => (Object.is(v, -0) ? "-0" : String(v))).join(",");
}

function digest(values: number[]): string {
  let hash = 0;
  for (const v of values) {
    const code = Object.is(v, -0) ? -7 : Number.isNaN(v) ? -9 : v;
    hash = (Math.imul(hash, 31) + Math.floor(code * 64)) | 0;
  }
  return values.length + ":" + hash;
}

function values(n: number, special: boolean): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const r = random();
    out.push(special && i % 9 === 4 ? NaN : special && i % 11 === 2 ? -0 : Math.floor(r * 400) - 200 + r);
  }
  return out;
}

for (const n of [2, 3, 17, 48, 49, 1000, 30000]) {
  for (const special of [false, true]) {
    const base = values(n, special);
    const f64 = new Float64Array(base);
    const f32 = new Float32Array(base);
    const i32 = new Int32Array(base);
    const parts = [
      digest(Array.from(f64.toSorted((a, b) => a - b))),
      digest(Array.from(f64.toSorted((a, b) => b - a))),
      digest(Array.from(f64.toSorted((a, b) => (a < b ? -1 : a > b ? 1 : 0)))),
      digest(Array.from(f32.toSorted((x, y) => (x > y ? -1 : x < y ? 1 : 0)))),
      digest(Array.from(f32.toSorted((a, b) => b - a))),
      digest(Array.from(i32.toSorted((a, b) => b - a))),
      digest(Array.from(new Uint16Array(i32).sort((a, b) => b - a))),
      digest(Array.from(new Int8Array(i32).sort((a, b) => a - b))),
    ];
    console.log(n, special, parts.join(" "));
  }
}

// Small inputs in full, NaN and -0 included.
const mixed = new Float64Array([3, NaN, -0, 0, -1.5, Infinity, -Infinity, 2, NaN, 0, -0]);
console.log(show(Array.from(mixed.toSorted((a, b) => a - b))));
console.log(show(Array.from(mixed.toSorted((a, b) => b - a))));
console.log(show(Array.from(mixed.toSorted((a, b) => (a < b ? -1 : a > b ? 1 : 0)))));

// Comparators that are not recognized, with their call counts.
let calls = 0;
const counted = new Float64Array(values(200, false));
const byMod = counted.toSorted((a, b) => {
  calls++;
  return (Math.abs(Math.floor(a)) % 7) - (Math.abs(Math.floor(b)) % 7);
});
console.log(calls, digest(Array.from(byMod)));
calls = 0;
const ints = new Int32Array(values(64, false));
ints.sort((a, b) => {
  calls++;
  return a > b ? 1 : -1;
});
console.log(calls, show(Array.from(ints.subarray(0, 8))));
const inconsistent = new Uint8Array([5, 1, 4, 2, 3, 9, 0, 7, 8, 6]);
console.log(show(Array.from(inconsistent.toSorted(() => -1))), show(Array.from(inconsistent.toSorted(() => 1))));
console.log(show(Array.from(inconsistent.toSorted((a) => (a > 4 ? 1 : -1)))));
console.log(show(Array.from(inconsistent.toSorted((a, b) => a - b + 1))));
console.log(show(Array.from(inconsistent.toSorted((a, b) => (a - b) * NaN))));

// The comparator sees the receiver unchanged; its writes are overwritten.
const live = new Int16Array([4, 2, 9, 1]);
let seen = "";
live.sort((a, b) => {
  seen += live[0] + ";";
  live[3] = 77;
  return a - b + 0 * calls;
});
console.log(seen, show(Array.from(live)));

// A throwing comparator leaves the receiver as the comparator left it.
const fragile = new Float32Array([3, 1, 2, 5, 4]);
let count = 0;
try {
  fragile.sort((a, b) => {
    if (++count === 3) throw new Error("stop at " + a + " " + b);
    return a - b;
  });
} catch (error) {
  console.log((error as Error).message, show(Array.from(fragile)));
}
const original = new Uint32Array([9, 8, 7]);
try {
  original.toSorted((): number => {
    throw new RangeError("no order");
  });
} catch (error) {
  console.log((error as Error).name, show(Array.from(original)));
}

// sort returns the receiver; Buffer comparators work like Uint8Array's.
const same = new Int32Array([3, 1, 2]);
console.log(same.sort((a, b) => b - a) === same, show(Array.from(same)));
const buf = Buffer.from([1, 200, 3, 100]);
console.log(buf.sort((a, b) => b - a).toString("hex"), show(Array.from(buf.toSorted((a, b) => a - b))));
