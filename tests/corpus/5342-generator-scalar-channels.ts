// Number and boolean yield channels driven by loops, spreads and
// next(): completion values of other types next to yields, finally blocks
// that yield after return statements and after return()/throw(), values
// left untaken in the generator, nested drives, and booleans that must
// stay exact through the slot.
function* bits(n: number): Generator<boolean, string, undefined> {
  for (let i = 0; i < n; i++) yield i % 3 === 0;
  return "bits done";
}
function* finallyYield(): Generator<number, string, undefined> {
  try {
    yield 1;
    return "from try";
  } finally {
    yield 2;
    yield 3;
  }
}
function* negatives(): Generator<number, void, undefined> {
  yield -0;
  yield NaN;
  yield Infinity;
  yield 0.1 + 0.2;
}

const flags: boolean[] = [];
for (const b of bits(7)) flags.push(b);
console.log("bits", flags.join(","), [...bits(4)].map((b) => (b ? 1 : 0)).join(""));
const bg = bits(2);
console.log(JSON.stringify(bg.next()), JSON.stringify(bg.next()), JSON.stringify(bg.next()));
console.log(JSON.stringify(bg.next()));

console.log("finally loop", [...finallyYield()].join(","));
const fy = finallyYield();
const steps: string[] = [];
for (let i = 0; i < 5; i++) steps.push(JSON.stringify(fy.next()));
console.log("finally next", steps.join(" "));
const fr = finallyYield();
console.log(JSON.stringify(fr.next()), JSON.stringify(fr.return("early")));
console.log(JSON.stringify(fr.next()), JSON.stringify(fr.next()), JSON.stringify(fr.next()));
const ft = finallyYield();
ft.next();
console.log(JSON.stringify(ft.throw(new Error("thrown in"))));
try {
  console.log(JSON.stringify(ft.next()), JSON.stringify(ft.next()));
} catch (e) {
  console.log("rethrown", (e as Error).message);
}

const exact: string[] = [];
for (const v of negatives()) exact.push(Object.is(v, -0) ? "-0" : String(v));
console.log("exact", exact.join(","));

// Values yielded but never taken, then the generator resumed again.
const skip = negatives();
skip.next();
skip.next();
for (const v of skip) console.log("rest", v);

// Nested drives over number channels.
function* nested(n: number): Generator<number, void, undefined> {
  for (let i = 0; i < n; i++) for (const j of negatives()) if (j === Infinity) yield i;
}
let nestedSum = 0;
for (const v of nested(5)) nestedSum += v;
console.log("nested", nestedSum);

// Spread drives.
const spread = [...bits(5)];
console.log("spread", spread[0], spread[1], spread.length);
console.log("max", Math.max(...[...negatives()]));
