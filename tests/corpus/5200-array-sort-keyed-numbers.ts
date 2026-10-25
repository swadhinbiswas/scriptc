// Numeric comparators the runtime orders by key: `a - b`, `b - a` and the
// three-way ternaries. Results, stability-sensitive values (-0 next to 0)
// and NaN placement must match the comparator sort.
let seed = 99;
function random(): number {
  seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
  return seed / 4294967296;
}

function digest(values: number[]): string {
  let hash = 0;
  for (let i = 0; i < values.length; i++) {
    const v = values[i]!;
    const code = Object.is(v, -0) ? -7 : Number.isNaN(v) ? -9 : v;
    hash = (Math.imul(hash, 31) + Math.floor(code * 1000)) | 0;
  }
  return values.length + ":" + hash;
}

function show(values: number[]): string {
  return values.map((v) => (Object.is(v, -0) ? "-0" : String(v))).join(",");
}

const sizes = [0, 1, 2, 3, 16, 17, 47, 48, 49, 50, 64, 100, 1000, 20000];
const inputs: [string, (n: number, i: number) => number][] = [
  ["ints", () => Math.floor(random() * 200) - 100],
  ["wide", () => Math.floor(random() * 4294967296) - 2147483648],
  ["doubles", () => (random() - 0.5) * 1e6],
  ["tiny", () => (random() - 0.5) * 1e-300],
  ["presorted", (n, i) => i * 3],
  ["reversed", (n, i) => (n - i) * 0.5],
  ["ties-reversed", (n, i) => Math.floor((n - i) / 3)],
  ["two-runs", (n, i) => (i < n / 2 ? i : i - n / 2)],
  ["appended", (n, i) => (i + 5 < n ? i : Math.floor(random() * n))],
  ["infinities", (n, i) => (i % 7 === 0 ? Infinity : i % 5 === 0 ? -Infinity : i % 11)],
];

for (const [label, make] of inputs) {
  const lines: string[] = [];
  for (const n of sizes) {
    const base: number[] = [];
    for (let i = 0; i < n; i++) base.push(make(n, i));
    const ascending = base.slice().sort((a, b) => a - b);
    const descending = base.slice().sort((a, b) => b - a);
    const ternary = base.toSorted((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const flipped = base.toSorted((x, y) => (x > y ? -1 : x < y ? 1 : 0));
    lines.push(n + "=" + digest(ascending) + "/" + digest(descending) + "/" + digest(ternary) + "/" + digest(flipped));
  }
  console.log(label, lines.join(" "));
}

// Small inputs printed in full.
const small = [5, -3, 2.5, 0, 9, -3, 1e21, -1e-7, 2.5, 7];
console.log(show(small.toSorted((a, b) => a - b)));
console.log(show(small.toSorted((a, b) => b - a)));
console.log(show(small.toSorted((a, b) => (b < a ? -1 : b > a ? 1 : 0))));
console.log(show(small), "unchanged by toSorted");

// -0 and 0 compare equal, so their original order survives.
const zeros = [0, -0, 3, -0, 0, -1, 0, -0];
console.log(show(zeros.toSorted((a, b) => a - b)));
console.log(show(zeros.toSorted((a, b) => b - a)));
console.log(show(zeros.toSorted((a, b) => (a < b ? -1 : a > b ? 1 : 0))));
const manyZeros: number[] = [];
for (let i = 0; i < 300; i++) manyZeros.push(i % 3 === 0 ? -0 : i % 3 === 1 ? 0 : (i % 17) - 8);
console.log(digest(manyZeros.toSorted((a, b) => a - b)), show(manyZeros.toSorted((a, b) => a - b).slice(100, 140)));

// NaN makes the comparator inconsistent; the comparator sort decides.
const withNaN = [3, NaN, 1, 2, NaN, 0, -1, 5, 4];
console.log(show(withNaN.toSorted((a, b) => a - b)));
console.log(show(withNaN.toSorted((a, b) => b - a)));
console.log(show(withNaN.toSorted((a, b) => (a < b ? -1 : a > b ? 1 : 0))));

// sort returns its receiver, sorted in place.
const inPlace = [4, 1, 3, 2];
const same = inPlace.sort((a, b) => a - b);
console.log(same === inPlace, show(inPlace));

// Holes and appended elements take the snapshot path.
const sparse: number[] = [5, 3];
sparse[6] = 1;
sparse[4] = 9;
sparse.sort((a, b) => b - a);
console.log(sparse.length, show(sparse.filter(() => true)), 4 in sparse, 5 in sparse);
const holey: number[] = [];
holey[3] = 2;
holey[1] = 8;
holey[0] = -1;
const sortedHoley = holey.toSorted((a, b) => a - b);
console.log(sortedHoley.length, String(sortedHoley), 3 in holey);
