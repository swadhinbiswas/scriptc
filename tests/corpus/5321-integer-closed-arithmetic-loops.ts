// Loop-carried number locals updated by exact integer arithmetic (`+ - * %`)
// stay integers across back edges when every write lands in a fixed bound:
// `v = (v * 31 + n) % 1000003` keeps v a non-negative int32. Every form
// that can leave the bound, produce -0, NaN or a fraction, or round above
// 2^53 must still behave exactly like the JavaScript doubles.

function kernel(): number {
  let total: number = 0;
  for (let k: number = 1; k <= 40; k++) {
    const n: number = k % 5;
    let v: number = k;
    for (let i: number = 0; i < 1000; i++) v = (v * 31 + n) % 1000003;
    total += v;
  }
  return total;
}

function hashLoop(start: number, n: number, times: number): number {
  let v: number = start;
  for (let i: number = 0; i < times; i++) v = (v * 31 + n) % 1000003;
  return v;
}
console.log("kernel", kernel(), hashLoop(7, 3, 5000));

// The induction counter feeds the write.
function counted(): number {
  let h: number = 0;
  for (let i: number = 0; i < 5000; i++) h = (h * 131 + i) % 65521;
  return h;
}
console.log("counter", counted());

// A wrap counter, early exits, and a write on one branch only.
function exits(): string {
  let wrap: number = 0;
  let seen: number = 0;
  for (let i: number = 0; i < 100; i++) {
    if (i % 7 === 3) continue;
    wrap = (wrap + 3) % 10;
    if (wrap === 9 && i > 50) break;
    if (i % 2 === 0) seen = (seen * 3 + wrap) % 101;
  }
  let spins: number = 0;
  let state: number = 1;
  while (state !== 0 && spins < 1000) {
    state = (state * 5 + 3) % 16;
    spins++;
  }
  return `${wrap} ${seen} ${state} ${spins}`;
}
console.log("exits", exits());

// Intermediate products above 2^31 stay exact; results above 2^31 too.
function wide(): string {
  let big: number = 1;
  for (let i: number = 0; i < 2000; i++) big = (big * 31 + 7) % 2147483648;
  let bigger: number = 1;
  for (let i: number = 0; i < 2000; i++) bigger = (bigger * 3 + 1) % 4294967311;
  let top: number = 0;
  for (let i: number = 0; i < 2000; i++) top = Math.max(top, big + bigger + i);
  return `${big} ${bigger} ${top} ${big > 2147483647 || bigger > 2147483647}`;
}
console.log("2^31", wide());

// Products above 2^53 round like doubles; no integer proof applies.
function rounding(): string {
  let rounded: number = 123456789;
  for (let i: number = 0; i < 50; i++) rounded = (rounded * 1000003 + 7) % 9007199254740881;
  let doubled: number = 1;
  for (let i: number = 0; i < 60; i++) doubled = (doubled * 2 + 1) % 18014398509481984;
  return `${rounded} ${Number.isSafeInteger(rounded)} ${doubled} ${Number.isSafeInteger(doubled)}`;
}
console.log("2^53", rounding());

// A negative dividend: JS `%` keeps the dividend's sign, and an exact
// multiple of a negative dividend is -0. Unary minus of 0 is -0, and so is
// a possibly negative value times zero.
function negativeZero(): void {
  let negative: number = 0;
  for (let i: number = 0; i < 3; i++) negative = (negative * 2 - 4) % 4;
  console.log("-0", negative, Object.is(negative, -0), 1 / negative);
  let signed: number = 5;
  for (let i: number = 0; i < 20; i++) signed = (signed * 31 - 1000) % 997;
  console.log("signed", signed, Object.is(signed, -0));
  let negated: number = 14;
  for (let i: number = 0; i < 3; i++) negated = -(negated % 7);
  console.log("negated", negated, Object.is(negated, -0), 1 / negated);
  let zeroed: number = -3;
  for (let i: number = 0; i < 2; i++) zeroed = (zeroed % 5) * 0;
  console.log("zero product", Object.is(zeroed, -0), 1 / zeroed);
  let flipped: number = 1;
  for (let i: number = 0; i < 5; i++) flipped = -((flipped & 7) + 1);
  console.log("flipped", flipped, 1 / flipped);
  // An unwritten -0 entry survives a loop that never writes it.
  let untouched: number = -0;
  for (let i: number = 0; i < 4; i++) if (i > 10) untouched = (untouched + 1) % 3;
  console.log("untouched", Object.is(untouched, -0), 1 / untouched);
}
negativeZero();

// Entries that are not exact non-negative integers.
function fromEntry(start: number): number {
  let v: number = start;
  for (let i: number = 0; i < 10; i++) v = (v * 31 + 1) % 1000003;
  return v;
}
for (const start of [NaN, Infinity, -Infinity, 0.5, -0, -7, 2 ** 53, 2 ** 31, 2 ** 31 - 1])
  console.log("entry", start, fromEntry(start), Object.is(fromEntry(start), -0));

// A fractional or zero divisor.
function divisors(): string {
  let half: number = 3;
  for (let i: number = 0; i < 4; i++) half = (half * 3 + 1) % 2.5;
  let nan: number = 3;
  for (let i: number = 0; i < 4; i++) nan = (nan + 1) % 0;
  return `${half} ${nan}`;
}
console.log("divisors", divisors());

// Through a closure, like the js-compiled 41-closures benchmark.
function makeAdder(n: number): (x: number) => number {
  return function (x: number): number {
    return (x * 31 + n) % 1000003;
  };
}
function applyN(f: (x: number) => number, times: number, start: number): number {
  let v: number = start;
  for (let i: number = 0; i < times; i++) v = f(v);
  return v;
}
let viaClosure: number = 0;
for (let k: number = 1; k <= 20; k++) viaClosure += applyN(makeAdder(k % 5), 500, k);
console.log("closure", viaClosure, applyN(makeAdder(-2), 3, 0), applyN(makeAdder(0.5), 3, 1));
