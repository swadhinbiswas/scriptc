// Whole-program int32 facts for parameters, results and captured boxes
// start from non-negative int32s and widen to int32 when some write may be
// negative. Non-negative facts let `(x * 31 + n) % m` stay an integer
// through calls; a negative argument, result or box write anywhere must
// keep JavaScript's signed remainder and -0.

function step(x: number, n: number): number {
  return (x * 31 + n) % 1000003;
}
function applyN(times: number, start: number, n: number): number {
  let v: number = start;
  for (let i: number = 0; i < times; i++) v = step(v, n);
  return v;
}
let total: number = 0;
for (let k: number = 1; k <= 30; k++) total += applyN(1000, k, k % 5);
console.log("kernel", total);

// One call site passes a negative argument: the parameter widens.
function wrap(x: number, n: number): number {
  return (x * 3 + n) % 7;
}
function walk(start: number): number {
  let v: number = start;
  for (let i: number = 0; i < 10; i++) v = wrap(v, i % 3);
  return v;
}
const negative: number = wrap(-7, 0);
console.log("widened", walk(4), wrap(-5, 1), negative, Object.is(negative, -0), 1 / negative);

// A result that is negative on one path.
function delta(a: number, b: number): number {
  return (a - b) % 100;
}
function sumDeltas(n: number): number {
  let acc: number = 0;
  for (let i: number = 0; i < n; i++) acc = (acc + delta(i % 13, i % 7) + 100) % 1000;
  return acc;
}
const zero: number = delta(3, 103);
console.log("result", sumDeltas(50), delta(1, 2), zero, Object.is(zero, -0));

// Captured boxes: non-negative from the origin parameter, then widened by
// a negative write in a closure.
function counter(seed: number): () => number {
  let state: number = seed;
  return function (): number {
    state = (state * 5 + 3) % 16;
    return state;
  };
}
function drifting(seed: number): () => number {
  let state: number = seed;
  return function (): number {
    state = (state - 7) % 16;
    return state;
  };
}
const next = counter(1);
const down = drifting(2);
let seen: string = "";
for (let i: number = 0; i < 5; i++) seen += `${next()}/${down()} `;
console.log("boxes", seen.trim());
const exact = drifting(7);
const first: number = exact();
console.log("box -0", first, Object.is(first, -0), 1 / first);

// Recursion that counts down to zero.
function depth(n: number, acc: number): number {
  return n === 0 ? acc : depth(n - 1, (acc * 7 + n) % 101);
}
console.log("recursion", depth(20, 1), depth(0, 5));
