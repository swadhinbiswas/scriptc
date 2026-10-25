// Unbounded recursion throws Node's catchable RangeError; the program keeps
// running afterwards and bounded recursion still works.
function depth(n: number): number {
  return n === 0 ? 0 : 1 + depth(n - 1);
}

function endless(n: number): number {
  return endless(n + 1) + 1;
}

function sumTo(n: number, acc: number[]): number {
  acc.push(n);
  return n === 0 ? 0 : n + sumTo(n - 1, acc);
}

console.log("before", depth(3000));
try {
  console.log("unreachable", endless(0));
} catch (e) {
  const error = e as Error;
  console.log(e instanceof RangeError, e instanceof Error, error.name);
  console.log(error.message);
  console.log(String(error));
}

let attempts = 0;
for (let round = 0; round < 3; round++) {
  try {
    endless(round);
  } catch (e) {
    if (e instanceof RangeError) attempts++;
  }
}
console.log("caught rounds", attempts);

const trail: number[] = [];
console.log("after", depth(4000), sumTo(2500, trail), trail.length);

function guarded(): string {
  try {
    return String(endless(1));
  } catch (e) {
    return (e as Error).name + " handled";
  }
}
console.log(guarded());
