// Pure number recursion that walks an array by index, and multi-argument
// recursion (binomial coefficients).

function sumFrom(a: number[], i: number): number {
  return i >= a.length ? 0 : a[i]! + sumFrom(a, i + 1);
}

function maxFrom(a: number[], i: number, best: number): number {
  if (i >= a.length) return best;
  const v = a[i]!;
  return maxFrom(a, i + 1, v > best ? v : best);
}

function countAbove(a: number[], i: number, limit: number): number {
  if (i === a.length) return 0;
  return (a[i]! > limit ? 1 : 0) + countAbove(a, i + 1, limit);
}

// Divide and conquer over an index range.
function rangeSum(a: number[], lo: number, hi: number): number {
  if (hi - lo <= 1) return lo < hi ? a[lo]! : 0;
  const mid = (lo + hi) >> 1;
  return rangeSum(a, lo, mid) + rangeSum(a, mid, hi);
}

function binomial(n: number, k: number): number {
  if (k === 0 || k === n) return 1;
  return binomial(n - 1, k - 1) + binomial(n - 1, k);
}

const ints: number[] = [];
for (let i = 0; i < 2000; i++) ints.push(((i * 7919) % 1000) - 500);
console.log(sumFrom(ints, 0), maxFrom(ints, 0, -1e9), countAbove(ints, 0, 250), rangeSum(ints, 0, ints.length));

// Elements that are not int32: fractions, -0, NaN and huge values.
const mixed = [1, 2.5, 3, -0, 4];
console.log(sumFrom(mixed, 0), Object.is(sumFrom([-0], 0), 0), rangeSum(mixed, 0, 5));
console.log(sumFrom([1, NaN, 2], 0), maxFrom([3, NaN, 9], 0, 0), sumFrom([2 ** 31, 1], 0));
const big = [2147483647, 2147483647, 5];
console.log(sumFrom(big, 0), rangeSum(big, 0, 3), countAbove(big, 0, 6));
const precise = [2 ** 53, 1, 1];
console.log(sumFrom(precise, 0), rangeSum(precise, 0, 3));
// A hole-free array whose prefix grew by pushes and shrank by pops.
const grown: number[] = [];
for (let i = 0; i < 50; i++) grown.push(i * i);
grown.pop();
console.log(sumFrom(grown, 0), rangeSum(grown, 10, 40), sumFrom(grown, 49));
console.log(sumFrom([], 0), maxFrom([], 0, 7));

for (const [n, k] of [
  [5, 2],
  [10, 5],
  [20, 10],
  [24, 12],
]) {
  console.log("binomial", n, k, binomial(n, k));
}
console.log(binomial(4.5, 0), binomial(6, 6), binomial(-1, -1));
try {
  console.log(binomial(3, 5));
} catch (e) {
  console.log("binomial 3 5:", e instanceof RangeError, (e as Error).message);
}
