// Loops whose number locals hold integers until they do not: every check
// that leaves the integer copy (overflow past 2^53 - 1, -0, fractions,
// NaN, zero divisors) must continue with exactly Node's doubles.

function show(label: string, value: number): void {
  console.log(label, Object.is(value, -0) ? "-0" : String(value));
}

// A remainder chain that stays small.
function chain(start: number, n: number): number {
  let v: number = start;
  for (let i: number = 0; i < 100000; i++) v = (v * 31 + n) % 1000003;
  return v;
}
show("chain", chain(7, 3));
show("chain negative", chain(-7, -3));
show("chain fraction start", chain(7.5, 3));
show("chain fraction step", chain(7, 0.25));
show("chain NaN", chain(NaN, 1));
show("chain -0", chain(-0, 0));

// Products that leave the safe integers part-way and keep growing.
function grow(start: number, factor: number): number {
  let x: number = start;
  let steps: number = 0;
  while (steps < 80) {
    x = x * factor + 1;
    steps++;
  }
  return x;
}
show("grow 3", grow(1, 3));
show("grow -3", grow(1, -3));
show("grow 2", grow(0, 2));

// Sums that cross 2^53 - 1 on the way.
function crossing(): number {
  let s: number = 9007199254740900;
  for (let i: number = 0; i < 200; i++) {
    s += i;
    if (s % 1000 === -1) break;
  }
  return s;
}
show("crossing", crossing());

// -0 from a product, a remainder and a negation, each in its own loop.
function negativeZeroProduct(k: number): number {
  let p: number = 5;
  for (let i: number = 0; i < 3; i++) p = p * k;
  return p;
}
show("product -0", negativeZeroProduct(0) * -1);
show("product zero", negativeZeroProduct(0));
function negativeZeroTimes(): number {
  let p: number = 0;
  let q: number = 1;
  for (let i: number = 0; i < 4; i++) {
    p = q * (i - 2);
    q = p * 0;
  }
  return q;
}
show("times -0", negativeZeroTimes());
function negativeZeroRemainder(): number {
  let r: number = -9;
  let out: number = 1;
  for (let i: number = 1; i < 5; i++) {
    out = r % 3;
    r = r + i;
    if (out === 7) break;
  }
  return out;
}
show("remainder", negativeZeroRemainder());
function remainderNegZero(): number {
  let r: number = 0;
  for (let i: number = 0; i < 2; i++) {
    r = -6 % (3 + i * 0);
    if (r > 100) break;
  }
  return r;
}
show("remainder -0", remainderNegZero());
function negation(): number {
  let a: number = 3;
  let b: number = 1;
  for (let i: number = 0; i < 4; i++) {
    a = a - 1;
    b = -a;
    if (a * b === 999) break;
  }
  return b;
}
show("negation", negation());
function negationZero(): number {
  let a: number = 2;
  let b: number = 1;
  for (let i: number = 0; i < 2; i++) {
    a = a - 1;
    b = -a;
    if (a * b === 999) break;
  }
  return b;
}
show("negation -0", negationZero());

// A zero divisor part-way through.
function zeroDivisor(): number {
  let d: number = 3;
  let acc: number = 100;
  for (let i: number = 0; i < 6; i++) {
    acc = acc % d;
    d = d - 1;
    acc = acc + 50;
  }
  return acc;
}
show("zero divisor", zeroDivisor());

// Jumps out of the integer copy keep the locals current.
function jumps(limit: number): number {
  let total: number = 0;
  let count: number = 0;
  for (let i: number = 0; i < 1000; i++) {
    if (i % 3 === 0) continue;
    total = total + i * i;
    count++;
    if (total > limit) break;
  }
  return total * 1000 + count;
}
show("jumps", jumps(5000));
show("jumps huge", jumps(1e300));
function early(values: number[]): number {
  let sum: number = 0;
  let i: number = 0;
  while (i < values.length) {
    sum = sum + i;
    if (sum > 10) return sum;
    i++;
  }
  return -sum;
}
show("early", early([1, 2, 3, 4, 5, 6, 7]));
show("early short", early([1, 2]));
function labeled(): number {
  let hits: number = 0;
  outer: for (let a: number = 0; a < 5; a++) {
    let b: number = 0;
    while (b < 5) {
      b = b + 1;
      hits = hits + a * b;
      if (b === a) continue outer;
    }
  }
  return hits;
}
show("labeled", labeled());

// do-while with a bail in the condition-adjacent update.
function collatz(start: number): number {
  let n: number = start;
  let steps: number = 0;
  do {
    n = n % 2 === 0 ? n / 2 : 3 * n + 1;
    steps = steps + 1;
  } while (n !== 1 && steps < 1000);
  return steps;
}
show("collatz", collatz(27));
function doubling(): number {
  let x: number = 1;
  let n: number = 0;
  do {
    x = x * 2;
    n++;
  } while (n < 60);
  return x;
}
show("doubling", doubling());

// The update statement itself bails.
function bigStep(): number {
  let last: number = 0;
  for (let j: number = 1; j < 2e16; j = j * 1000 + 1) last = j;
  return last;
}
show("big step", bigStep());

// Speculated indexes into typed arrays and arrays.
const bytes: Uint8Array = new Uint8Array(64);
let k: number = 0;
for (let j: number = 3; j < 64; j += 3) {
  bytes[j] = j;
  k = k + j;
}
show("bytes", bytes[63] + bytes[3] + k);
const squares: number[] = [];
for (let j: number = 0; j < 10; j++) {
  let sq: number = j * j;
  sq = sq - j;
  squares.push(sq);
}
console.log(squares.join(","));

// Bitwise leaves and conversions.
function lcg(seed: number): number {
  let s: number = seed;
  let mixed: number = 0;
  for (let i: number = 0; i < 1000; i++) {
    s = (s * 1103515245 + 12345) | 0;
    mixed = mixed + (s >>> 16);
    mixed = mixed % 4294967296;
  }
  return mixed;
}
show("lcg", lcg(42));
function unsigned(): number {
  let u: number = 0;
  for (let i: number = 0; i < 40; i++) u = (u * 2 + 1) >>> 0;
  return u;
}
show("unsigned", unsigned());
function complement(): number {
  let c: number = 5;
  for (let i: number = 0; i < 3; i++) c = ~c + c * 2;
  return c;
}
show("complement", complement());

// Inputs that are not integers on entry, and loop-invariant inputs.
function scaled(step: number): number {
  let x: number = 0;
  for (let i: number = 0; i < 10; i++) {
    x = x + step;
    if (x % 3 === -1) break;
  }
  return x;
}
show("scaled int", scaled(3));
show("scaled fraction", scaled(0.1));
show("scaled huge", scaled(1e300));
show("scaled Infinity", scaled(Infinity));
function invariantNegZero(z: number): number {
  let x: number = 0;
  for (let i: number = 0; i < 3; i++) {
    x = z * 1;
    if (x === 5) break;
  }
  return x;
}
show("invariant -0", invariantNegZero(-0));
