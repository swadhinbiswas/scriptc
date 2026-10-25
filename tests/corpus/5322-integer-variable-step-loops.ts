// Counted loops whose step is a loop-invariant binding (`j += i`): with a
// positive integer step and a `<`/`<=` limit the counter stays an exact
// integer, as in a sieve. Steps that are zero, negative, fractional, huge
// or written by the body, and limits near 2^31 and 2^53, keep ordinary
// double behavior.

function sieve(limit: number): string {
  const flags: Uint8Array = new Uint8Array(limit + 1);
  let count: number = 0;
  for (let i: number = 2; i <= limit; i++) {
    if (flags[i] === 0) {
      count++;
      for (let j: number = i * 2; j <= limit; j += i) flags[j] = 1;
    }
  }
  let marked: number = 0;
  for (let i: number = 0; i <= limit; i++) marked += flags[i];
  return `${count} ${marked}`;
}
console.log("sieve", sieve(100000), sieve(2), sieve(0));

// Steps proven positive integers, including through a typed array read.
function fixedSteps(): string {
  const step: number = 3;
  let sum: number = 0;
  let last: number = -1;
  for (let j: number = 1; j < 50; j += step) {
    sum += j;
    last = j;
  }
  const bytes: Uint8Array = new Uint8Array([4, 0, 9]);
  const stride: number = bytes[2] + 1;
  let hits: number = 0;
  for (let j: number = bytes[1]; j <= 95; j += stride) hits += j;
  return `${sum} ${last} ${hits}`;
}
console.log("fixed", fixedSteps());

// Counters that cross 2^31 and 2^32 at the final step.
function crossingFixed(): string {
  const quarter: number = 1073741824;
  let visits: number = 0;
  let last: number = 0;
  for (let j: number = 0; j <= 2147483648; j += quarter) {
    visits++;
    last = j;
  }
  const largest: number = 2147483647;
  let total: number = 0;
  for (let j: number = 1; j <= 4294967295; j += largest) total += j;
  return `${visits} ${last} ${total}`;
}
console.log("2^31", crossingFixed());

// Near 2^53 additions round: the counter must not be treated as exact.
function nearExactLimit(): string {
  const step: number = 3;
  let visits: number = 0;
  let last: number = 0;
  for (let j: number = 9007199254740982; j <= 9007199254740992; j += step) {
    visits++;
    last = j;
  }
  const two: number = 2;
  let after: number = 0;
  for (let j: number = 9007199254740986; j <= 9007199254740996; j += two) after = j;
  return `${visits} ${last} ${after}`;
}
console.log("2^53", nearExactLimit());

// Unknown steps: zero, -0, negative, fractional, NaN and Infinity.
function strided(start: number, limit: number, step: number): string {
  let visits: number = 0;
  let sum: number = 0;
  let last: number = NaN;
  for (let j: number = start; j < limit; j += step) {
    if (++visits > 6) break;
    sum += j;
    last = j;
  }
  return `${visits} ${sum} ${last}`;
}
console.log("positive", strided(0, 20, 3), strided(5, 5, 1), strided(1, 1e9, 2e8));
console.log("zero", strided(0, 10, 0), strided(0, 10, -0));
console.log("negative", strided(0, 10, -3));
console.log("fraction", strided(0, 3, 0.5), strided(0.25, 3, 1));
console.log("nan", strided(0, 10, NaN), strided(0, 10, Infinity));

// Steps the loop writes, and loops left early.
function writtenStep(): string {
  let grown: number = 1;
  let walked: string = "";
  for (let j: number = 0; j <= 100; j += grown) {
    walked += j + ",";
    grown = grown * 2 + 0.5;
  }
  let stride: number = 7;
  let kept: number = 0;
  for (let j: number = 3; j < 200; j += stride) {
    if (j % 2 === 0) continue;
    if (j > 150) break;
    kept += j;
  }
  return `${walked} ${grown} ${kept}`;
}
console.log("written", writtenStep());

// The step depends on an outer counter that is itself an exact int.
function nested(): number {
  let pairs: number = 0;
  for (let i: number = 1; i <= 50; i++) for (let j: number = i; j <= 1000; j += i) pairs++;
  return pairs;
}
console.log("nested", nested());
