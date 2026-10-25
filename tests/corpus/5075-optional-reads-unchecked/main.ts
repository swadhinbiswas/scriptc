// Kernels over maybe-missing elements with noUncheckedIndexedAccess: game
// tree minimax over ragged rows, divide-and-conquer sums that read past
// the end, and min/max of record fields.
interface Rec {
  id: number;
  score: number;
}

function leaf(grid: number[][], node: number): number {
  return grid[node >> 3]?.[node & 7] ?? 0;
}
function minimax(grid: number[][], node: number, depth: number, maxing: boolean): number {
  if (depth === 0) return leaf(grid, node % 90);
  let best = maxing ? -Infinity : Infinity;
  for (let c = 0; c < 3; c++) {
    const score = minimax(grid, node * 3 + c, depth - 1, !maxing);
    best = maxing ? Math.max(best, score) : Math.min(best, score);
  }
  return best;
}
const grid: number[][] = [];
for (let r = 0; r < 10; r++) {
  const row: number[] = [];
  for (let c = 0; c < (r % 3 === 0 ? 5 : 8); c++) row.push((r * 37 + c * 11) % 23);
  grid.push(row);
}
console.log(minimax(grid, 0, 5, true), minimax(grid, 1, 4, false));

function sum(a: number[], lo: number, hi: number): number {
  if (hi - lo <= 1) {
    let v = a[lo];
    if (v === undefined) v = 0;
    return v;
  }
  const mid = (lo + hi) >> 1;
  return sum(a, lo, mid) + sum(a, mid, hi);
}
function maybeSum(a: number[], lo: number, hi: number): number | undefined {
  if (hi - lo <= 1) return a[lo];
  const mid = (lo + hi) >> 1;
  const left = maybeSum(a, lo, mid);
  const right = maybeSum(a, mid, hi);
  return left === undefined ? right : right === undefined ? left : left + right;
}
const values: number[] = [];
for (let i = 0; i < 100; i++) values.push((i * 7) % 13);
console.log(sum(values, 0, values.length + 9), maybeSum(values, 0, 140), maybeSum(values, 100, 120));

const recs: Rec[] = [];
for (let i = 0; i < 50; i++) recs.push({ id: i, score: (i * 7919) % 101 });
let lo = Infinity;
let hi = -Infinity;
for (let i = 0; i <= recs.length + 1; i++) {
  const score = recs[i]?.score;
  if (score === undefined) continue;
  lo = Math.min(lo, score);
  hi = Math.max(hi, score);
}
let best = -Infinity;
for (let i = 0; i < recs.length; i++) best = Math.max(best, recs[i]!.score);
function choose(values: number[], useFirst: boolean): number | string {
  const value = useFirst ? values[0] : values[1];
  if (value === undefined) return "missing";
  return value;
}
for (let i = 0; i < 4; i++) {
  const c = i % 2 === 0 ? values[i * 40] : values[i * 40 + 1];
  console.log(c, c ?? "none", choose(values.slice(i * 50), i > 1));
}
const first = values[0];
const missing = values[500];
console.log(lo, hi, best, first ?? -1, missing ?? -1, missing === undefined);
