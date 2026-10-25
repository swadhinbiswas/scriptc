// While-loop counters that the loop only increments by integer literals and
// that a conjunct of the condition bounds (`it < MAX` in an escape-time
// loop) stay exact integers. Counters written in the condition, decremented,
// stepped by fractions or unknown values, or incremented inside nested
// loops, bounds the loop writes, disjunctions, and limits near 2^31, 2^32
// and 2^53 keep ordinary double behavior.

const MAX: number = 300;

function escape(cx: number, cy: number): number {
  let x: number = 0;
  let y: number = 0;
  let it: number = 0;
  while (x * x + y * y <= 4 && it < MAX) {
    const xt: number = x * x - y * y + cx;
    y = 2 * x * y + cy;
    x = xt;
    it++;
  }
  return it;
}
let inside: number = 0;
let total: number = 0;
for (let py: number = 0; py < 24; py++) {
  for (let px: number = 0; px < 32; px++) {
    const it: number = escape((px / 32) * 3 - 2, (py / 24) * 2 - 1);
    total += it;
    if (it === MAX) inside++;
  }
}
console.log("escape", inside, total, escape(0, 0), escape(2, 2));

// Reversed and inclusive bounds, two increments per pass, early exits and
// continue, a counter used as an index and a remainder operand.
function shapes(limit: number): string {
  const table: Int32Array = new Int32Array(64);
  let a: number = 0;
  while (limit > a) a += 3;
  let b: number = 1;
  while (b <= 40) {
    b++;
    if (b % 7 === 0) continue;
    b += 2;
  }
  let c: number = 0;
  while (c < 63) {
    table[c] = c % 5;
    if (table[c] === 4 && c > 50) break;
    c++;
  }
  let sum: number = 0;
  for (let i: number = 0; i < 64; i++) sum += table[i];
  return `${a} ${b} ${c} ${sum}`;
}
console.log("shapes", shapes(10), shapes(0), shapes(-5), shapes(64));

// A module-level counter in the initializer.
let steps: number = 0;
while (steps < 1000 && (steps * 7) % 11 !== 10) steps++;
console.log("module", steps);

// Entries outside the proof: fractions, -0, NaN and Infinity starts.
function starts(start: number): string {
  let i: number = start;
  while (i < 5) i++;
  return `${i} ${Object.is(i, -0)}`;
}
console.log("starts", starts(0.5), starts(-0), starts(NaN), starts(Infinity), starts(-2), starts(9));

// Counters that cross 2^31, 2^32 and 2^53 under their bound.
function wide(): string {
  let i: number = 0;
  while (i < 3000000000) i += 1000000000;
  let j: number = 2147483600;
  while (j < 2147483647) j += 13;
  let k: number = 9007199254740980;
  while (k < 9007199254740991) k += 4;
  let u: number = 4294967290;
  while (u <= 4294967295) u++;
  return `${i} ${j} ${k} ${u} ${j | 0} ${u >>> 0}`;
}
console.log("wide", wide());

// Forms the proof refuses: a counter written by its condition, decrements,
// unknown and fractional steps, nested increments, written bounds and
// disjunctions. (The first counter stays bounded: its condition writes only
// `budget`, which is not the counter.)
function refused(n: number): string {
  let a: number = 0;
  let budget: number = n;
  while (budget-- > 0 && a < 10) a++;
  let b: number = 0;
  while (b++ < 5) b += 0;
  let c: number = 10;
  while (c < 20) {
    c++;
    c--;
    c += 2;
  }
  let d: number = 0;
  while (d < 3) d += 0.75;
  let e: number = 0;
  while (e < 20) e += n;
  let f: number = 0;
  while (f < 6) {
    let g: number = 0;
    while (g < 3) {
      f++;
      g++;
    }
  }
  let h: number = 0;
  let cap: number = 4;
  while (h < cap) {
    h++;
    if (h === 3) cap = 4.5;
  }
  let k: number = 0;
  while (k < 3 || k === 3) k++;
  return `${a} ${budget} ${b} ${c} ${d} ${e} ${f} ${h} ${cap} ${k}`;
}
console.log("refused", refused(3), refused(25));
