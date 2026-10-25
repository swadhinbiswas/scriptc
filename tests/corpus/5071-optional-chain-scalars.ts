// Optional chains that end in number or boolean values: missing elements,
// null receivers and nested reads give undefined, the chain body runs only
// for a present receiver, and `??` evaluates its default lazily.
interface Rec {
  id: number;
  score: number;
  flag: boolean;
}
const recs: Rec[] = [
  { id: 1, score: 3, flag: true },
  { id: 2, score: 0, flag: false },
  { id: 3, score: NaN, flag: true },
];

let lo = Infinity;
let hi = -Infinity;
let count = 0;
for (let i = 0; i <= recs.length; i++) {
  const score = recs[i]?.score;
  if (score === undefined) {
    console.log("missing", i);
    continue;
  }
  lo = Math.min(lo, score);
  hi = Math.max(hi, score);
  count++;
}
console.log(lo, hi, count);

for (let i = 0; i <= recs.length; i++) {
  console.log(
    recs[i]?.score ?? -1,
    recs[i]?.flag ?? "none",
    recs[i]?.score || "falsy",
    recs[i]?.flag === true,
    recs[i]?.score === 3,
    !recs[i]?.flag,
  );
  let flag = recs[i]?.flag;
  if (flag === undefined) flag = false;
  console.log(flag);
}

const grid: number[][] = [[1, 2], [3]];
for (let r = 0; r < 3; r++)
  for (let c = 0; c < 3; c++) {
    const cell = grid[r]?.[c];
    console.log(r, c, cell, grid[r]?.[c] ?? 9, cell === undefined ? "u" : cell > 1);
  }

const nothing: Rec | null | undefined = recs.length > 5 ? recs[0] : null;
console.log(nothing?.score, nothing?.score ?? 5, nothing?.flag === undefined);

const log: string[] = [];
function fallback(label: string): number {
  log.push(label);
  return 7;
}
let k = 0;
const first = recs[k++]?.score ?? fallback("first");
const second = recs[k + 10]?.score ?? fallback("second");
console.log(first, second, k, log.join(","));

function describe(value: number | undefined): string {
  return value === undefined ? "none" : `value ${value * 2}`;
}
for (let i = 0; i < 5; i++) console.log(describe(recs[i]?.score));
