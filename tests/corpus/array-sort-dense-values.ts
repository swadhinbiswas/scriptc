// Comparator sorts of dense arrays (no holes, no undefined): numbers,
// strings, nested arrays and objects by a numeric key, across run shapes,
// with stability, comparator arity, NaN and inconsistent results.

let seed = 7;
function next(): number {
  seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
  return seed / 4294967296;
}

function checksum(values: number[]): number {
  let h = 0;
  for (let i = 0; i < values.length; i++) h = (h * 31 + values[i]! * (i + 1)) % 1000000007;
  return h;
}

function ordered(values: number[], descending: boolean): boolean {
  for (let i = 1; i < values.length; i++) {
    if (descending ? values[i - 1]! < values[i]! : values[i - 1]! > values[i]!) return false;
  }
  return true;
}

function shapes(n: number): [string, number[]][] {
  const random: number[] = [];
  const sorted: number[] = [];
  const reversed: number[] = [];
  const few: number[] = [];
  const sawtooth: number[] = [];
  for (let i = 0; i < n; i++) {
    random.push(Math.floor(next() * 1000) - 500);
    sorted.push(i * 3);
    reversed.push((n - i) * 3);
    few.push(Math.floor(next() * 4));
    sawtooth.push(i % 37);
  }
  return [
    ["random", random],
    ["sorted", sorted],
    ["reversed", reversed],
    ["few", few],
    ["sawtooth", sawtooth],
  ];
}

for (const n of [0, 1, 2, 3, 15, 16, 17, 33, 100, 1000, 5000]) {
  const parts: string[] = [];
  for (const [name, values] of shapes(n)) {
    const asc = values.slice();
    const returned = asc.sort((a, b) => a - b);
    const desc = values.toSorted((a, b) => b - a);
    parts.push(
      name +
        ":" +
        (returned === asc) +
        ordered(asc, false) +
        ordered(desc, true) +
        (desc.length === n) +
        checksum(asc) +
        "/" +
        checksum(desc) +
        "/" +
        checksum(values),
    );
  }
  console.log(n, parts.join(" "));
}

// Objects by a numeric key keep equal keys in input order.
interface Row {
  key: number;
  id: number;
}
const rows: Row[] = [];
for (let i = 0; i < 2000; i++) rows.push({ key: Math.floor(next() * 50), id: i });
const byKey = rows.toSorted((a, b) => a.key - b.key);
let stable = true;
for (let i = 1; i < byKey.length; i++) {
  const p = byKey[i - 1]!,
    q = byKey[i]!;
  if (p.key > q.key || (p.key === q.key && p.id > q.id)) stable = false;
}
console.log("rows stable", stable, byKey[0]!.id, byKey[1999]!.id, rows[0]!.id);
rows.sort((a, b) => b.key - a.key);
let stableDesc = true;
for (let i = 1; i < rows.length; i++) {
  const p = rows[i - 1]!,
    q = rows[i]!;
  if (p.key < q.key || (p.key === q.key && p.id > q.id)) stableDesc = false;
}
console.log("rows desc stable", stableDesc, rows[0]!.key, rows[1999]!.key);

// Strings and nested arrays are reference elements too.
const words = ["pear", "fig", "banana", "kiwi", "apple", "plum", "date", "cherry", "lime"];
console.log(words.toSorted((a, b) => a.length - b.length).join(","));
console.log(words.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)).join(","));
const nested = [[3, 3, 3], [1], [2, 2], [], [4, 4, 4, 4], [0]];
nested.sort((a, b) => a.length - b.length);
console.log(nested.map((xs) => xs.join("")).join("|"));

// Comparators that ignore their parameters.
const fewer = [5, 3, 9, 1, 7];
console.log(fewer.toSorted(() => 0).join(","), fewer.toSorted(() => NaN).join(","));

// NaN results count as equal; small inputs match Node's comparison order.
const withNaN = [3, NaN, 1, 2, NaN, 0];
console.log(withNaN.toSorted((a, b) => a - b).join(","));
const keys: Row[] = [
  { key: 2, id: 0 },
  { key: NaN, id: 1 },
  { key: 1, id: 2 },
  { key: 0, id: 3 },
];
console.log(
  keys
    .toSorted((a, b) => a.key - b.key)
    .map((row) => row.id)
    .join(","),
);
console.log([4, 1, 3, 2, 5, 0].toSorted((a, b) => (a % 2) - (b % 2)).join(","));

// Inconsistent comparators: the order depends on which pairs are
// compared, but the result is still a permutation of the input.
function sameValues(left: number[], right: number[]): boolean {
  const a = left.toSorted((x, y) => x - y),
    b = right.toSorted((x, y) => x - y);
  return a.length === b.length && a.every((x, i) => x === b[i]);
}
for (const n of [6, 40, 3000]) {
  const input: number[] = [];
  for (let i = 0; i < n; i++) input.push(Math.floor(next() * 100));
  const flaky = input.slice();
  let calls = 0;
  flaky.sort((a, b) => {
    calls++;
    return ((a * 7 + b + calls) % 3) - 1;
  });
  const coin = input.toSorted(() => (next() < 0.5 ? -1 : 1));
  const nan = input.toSorted((a, b) => (a % 3 === 0 ? NaN : a - b));
  console.log(
    "inconsistent",
    n,
    sameValues(flaky, input),
    sameValues(coin, input),
    sameValues(nan, input),
    calls > 0,
  );
}

// Signed zero, infinities and equal values keep their input order.
const zeros = [0, -0, Infinity, -Infinity, 1, -0, 0, -1];
const sortedZeros = zeros.toSorted((a, b) => a - b);
console.log(sortedZeros.map((x) => (Object.is(x, -0) ? "-0" : String(x))).join(","));
