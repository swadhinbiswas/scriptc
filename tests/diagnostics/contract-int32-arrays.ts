// Int32[] contracts fail when an element store into an array that can
// reach an Int32[] slot is not provably an int32 (through any alias, before
// or after the array reaches the slot), when the array can come from code
// scriptc cannot see, or when it escapes to such code.
import type { Int32 } from "@scriptc/types";

function halveInto(dst: number[], src: Int32[]): void {
  for (let i = 0; i < src.length; i++) dst[i] = src[i] / 2;
}

const fractions: number[] = [0.5, 1];
const ids: Int32[] = fractions;
const counts: Int32[] = [0, 0, 0];
const alias: number[] = counts;
alias.push(2.5);
counts.fill(Math.PI);
halveInto(counts, ids);
const doubled: Int32[] = counts.map((x) => x * 2);
const parsed: Int32[] = JSON.parse("[1, 2]");
const measure = (xs: Int32[]): number => xs.length;
console.log(ids, counts, doubled, parsed, [counts].map(measure));
