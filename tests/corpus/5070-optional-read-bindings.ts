// Reassigned bindings of optional element reads keep each snapshot's
// value: holes, present undefined, missing and noncanonical indices read
// as undefined, and later array writes do not change an earlier read.
const numbers = [5, 0, NaN, -1];
for (let i = -1; i <= numbers.length; i++) {
  let value = numbers[i];
  if (value === undefined) value = 100;
  let next = numbers[i + 1];
  next = next ?? numbers[i];
  console.log(i, value, next, next === undefined);
}

const holey: number[] = [1, , 3] as number[];
let hole = holey[1];
console.log(hole === undefined, hole);
hole = holey[2];
console.log(hole, holey[1.5], holey[-1]);

const words = ["x", "yy"];
let word = words[0];
words[0] = "changed";
console.log(word, word?.length, words[0]);
word = words[5];
console.log(word === undefined, word ?? "fallback");

const flags = [true, false];
let flag = flags[1];
console.log(flag, flag === false, flag === undefined);
flag = flags[9];
console.log(flag, flag ?? "none");

let total = 0;
let cursor = numbers[0];
for (let i = 1; cursor !== undefined; i++) {
  total += cursor;
  cursor = numbers[i];
}
console.log(total);

function firstAbove(values: number[], limit: number): number {
  let found = values[0];
  for (let i = 1; i < values.length + 2; i++) {
    const candidate = values[i];
    if (candidate !== undefined && candidate > limit) found = candidate;
  }
  return found ?? -1;
}
console.log(firstAbove([1, 9, 4, 12], 5), firstAbove([], 0));
