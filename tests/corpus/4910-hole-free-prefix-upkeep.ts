// Hole-free prefix upkeep after appending stores and bulk copies, and
// int32 parameters that the body reads but never writes.
//
// Appending stores into `new Array(n)` extend the prefix one index at a
// time; stores past it leave gaps that later stores close. Bulk copies
// (slice, concat, spread, fill) rescan the copied states, so holes and
// present undefined land at every position around eight-state steps.
function show(label: string, xs: (number | undefined)[]): void {
  const parts: string[] = [];
  for (let i = 0; i < xs.length; i++) parts.push(i in xs ? String(xs[i]) : "_");
  let visits = 0;
  xs.forEach(() => visits++);
  console.log(label, xs.length, parts.join(","), "visits", visits);
}

// A hole at `at` without `delete`: copying a hole deletes the target.
function punch<T>(xs: T[], at: number): void {
  const n = xs.length;
  xs.length = n + 1;
  xs.copyWithin(at, n, n + 1);
  xs.length = n;
}

function prefixSums(xs: number[]): number[] {
  const out = new Array<number>(xs.length);
  let s = 0;
  for (let i = 0; i < xs.length; i++) {
    s += xs[i];
    out[i] = s;
  }
  return out;
}

function prefixInPlace(xs: number[]): void {
  for (let i = 1; i < xs.length; i++) xs[i] += xs[i - 1];
}

const base: number[] = [];
for (let i = 0; i < 37; i++) base.push((i * 7) % 11);
show("sums", prefixSums(base));
const copy = base.slice();
prefixInPlace(copy);
show("in place", copy);

// Slices of a hole-free array: empty, reversed, negative, and past the end.
show("slice empty", base.slice(5, 2));
show("slice negative", base.slice(-5, -2));
show("slice past end", base.slice(30, 100));
const grown: (number | undefined)[] = base.slice(3, 9);
grown[grown.length + 1] = 1;
show("slice grown", grown);

// Stores that skip ahead, then fill the gap from both ends.
const gaps = new Array<number | undefined>(20);
for (let i = 0; i < 20; i += 3) gaps[i] = i;
show("strided", gaps);
for (let i = 19; i >= 0; i--) if (!(i in gaps)) gaps[i] = -i;
show("closed", gaps);
for (let i = 0; i < gaps.length; i++) gaps[i] = (gaps[i] ?? 0) * 2;
show("rewritten", gaps);

// A hole or present undefined at each offset around the eight-state steps,
// copied by slice, concat, spread, and fill.
for (const at of [0, 1, 6, 7, 8, 9, 15, 16, 17, 23, 24, 30]) {
  const holey: (number | undefined)[] = [];
  for (let i = 0; i < 32; i++) holey.push(i);
  punch(holey, at);
  const sliced = holey.slice(at > 4 ? at - 4 : 0);
  sliced[0] = 100;
  sliced[sliced.length] = 200;
  show("slice hole " + at, sliced);
  const undef = holey.slice();
  undef[at] = undefined;
  show("slice undefined " + at, undef.slice(1));
  const joined = holey.slice(0, at).concat(holey.slice(at));
  joined[at] = 7;
  show("concat " + at, joined);
  const spread: (number | undefined)[] = [-1];
  spread.push(...undef);
  show("spread " + at, spread);
  const filled = new Array<number | undefined>(32);
  filled.fill(3, 0, at);
  filled[at] = 4;
  show("fill " + at, filled);
}

// Whole-array copies far past one step, with the hole near the end.
const long: (number | undefined)[] = [];
for (let i = 0; i < 1000; i++) long.push(i & 15);
const tail = long.slice();
let total = 0;
for (let i = 0; i < tail.length; i++) total += tail[i] ?? 0;
punch(tail, 997);
const again = tail.slice(990);
show("long tail", again);
console.log("long total", total, tail.slice(0, 997).length, 997 in tail.slice());

// int32 parameters the body never writes: their reads keep the caller's
// number, including -0 at call sites the range analysis cannot prove.
function fib(n: number): number {
  return n < 2 ? n : fib(n - 1) + fib(n - 2);
}
function half(n: number): number {
  return n / 2 + (n | 0);
}
function same(n: number, sign: number): number {
  return Object.is(n * sign, -0) ? 1 : n;
}
function countDown(n: number): number {
  let steps = 0;
  for (let i = n; i > 0; i--) steps += i;
  return steps + n;
}
function rewrites(n: number): number {
  n = n + 1;
  return n * 2;
}
console.log(fib(0), fib(1), fib(20), half(7), half(-7), same(0, -1), same(5, 1));
console.log(countDown(10), rewrites(3), Object.is(fib(-0), -0), Object.is(half(-0), -0));
