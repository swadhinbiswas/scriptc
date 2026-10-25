// Per-element temporaries inside array callback chains: records built by
// one stage and read by the next, reduce accumulators, captured
// configuration, and consumers that write shared state.

interface Point {
  x: number;
  y: number;
}
class Sample {
  readonly label: string;
  readonly value: number;
  constructor(label: string, value: number) {
    this.label = label;
    this.value = value;
  }
}

const points: Point[] = [];
for (let i = 0; i < 25; i++) points.push({ x: i, y: (i * 13) % 7 });

function makeScale(factor: number, offset: number): (p: Point) => number {
  return (p) => p.x * factor + p.y + offset;
}

for (let round = 0; round < 3; round++) {
  const scale = makeScale(round + 1, round * 2);
  const scored = points
    .filter((p) => p.x % 3 !== round)
    .map((p) => ({ id: p.x, score: scale(p), flag: p.y > 3 }))
    .filter((s) => s.flag || s.score > 20);
  console.log(
    "round",
    round,
    scored.reduce((sum, s) => sum + s.score, 0),
    points.map((p) => ({ x: p.x * 2, y: p.y })).reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 }).x,
  );
}

// The initial accumulator object comes back unchanged for an empty chain.
const seedPoint: Point = { x: -1, y: -1 };
const none = points.filter((p) => p.x > 100).map((p) => ({ x: p.x, y: p.y })).reduce((acc, p) => (p.x > acc.x ? p : acc), seedPoint);
console.log("seed identity", none === seedPoint, none.x);
const best = points.filter((p) => p.y === 6).map((p) => ({ x: p.x, y: p.y })).reduce((acc, p) => (p.x > acc.x ? p : acc), seedPoint);
console.log("best", best === seedPoint, best.x, best.y);

// Records with string fields, and records that escape into the result.
const labels = points
  .filter((p) => p.y % 2 === 0)
  .map((p) => ({ name: `p${p.x}`, size: p.y }))
  .filter((r) => r.size > 0)
  .map((r) => r.name)
  .join(" ");
console.log("labels", labels);
const kept = points.filter((p) => p.x < 4).map((p) => ({ x: p.y, y: p.x }));
console.log("kept", kept.map((p) => `${p.x}/${p.y}`).join(","));

// Class instances.
const samples = points.map((p) => new Sample(p.x % 2 === 0 ? "even" : "odd", p.y));
console.log(
  "samples",
  samples.filter((s) => s.label === "even").map((s) => s.value).reduce((a, b) => a + b, 0),
  samples.filter((s) => s.value > 4).every((s) => s.value <= 6),
);

// Consumers that write shared state the stages never read.
let evens = 0;
let largest = -Infinity;
points
  .filter((p) => p.x % 2 === 0)
  .map((p) => p.y * 10)
  .forEach((v) => {
    evens++;
    if (v > largest) largest = v;
  });
console.log("forEach state", evens, largest);

// A consumer that throws after earlier elements were consumed.
let partial = 0;
try {
  points
    .filter((p) => p.x > 2)
    .map((p) => p.x)
    .forEach((x) => {
      if (x === 7) throw new RangeError("seven");
      partial += x;
    });
} catch (e) {
  console.log("forEach threw", (e as Error).message, partial);
}

// A stage that reads state the consumer writes keeps unfused order.
let budget = 3;
const spent = points
  .filter((p) => budget > 0)
  .map((p) => p.x)
  .reduce((acc, x) => {
    budget--;
    return acc + x;
  }, 0);
console.log("budget", spent, budget);

// flatMap with holes and explicit undefined in the returned arrays.
const inner: (number | undefined)[] = [1, undefined, 3];
const sparseInner: number[] = [];
sparseInner[2] = 5;
console.log(
  "flatMap",
  [0, 1].flatMap(() => inner).length,
  [0, 1].flatMap(() => sparseInner).length,
  [0, 1, 2].flatMap((n) => [n, n * 10]).filter((n) => n > 0).map((n) => n + 1).join(","),
  [0, 1].flatMap(() => inner).map((v) => (v === undefined ? "u" : String(v))).join(""),
);

// Chains inside callbacks of other chains.
const grid = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
];
console.log(
  "nested",
  grid.map((row) => row.filter((v) => v % 2 === 1).map((v) => v * v).reduce((a, b) => a + b, 0)).filter((s) => s > 10).join(","),
);
