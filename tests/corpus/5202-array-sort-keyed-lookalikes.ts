// Consistent comparators close to the keyed forms still sort as Node sorts
// them: accessors with effects, several fields, optional fields, captured
// state, scaled or negated results, declared and stored functions.
interface Pair {
  id: number;
  left: number;
  right: number;
  weight?: number;
}

class Score {
  id: number;
  base: number;
  reads = 0;
  constructor(id: number, base: number) {
    this.id = id;
    this.base = base;
  }
  get value(): number {
    this.reads++;
    return this.base * 2;
  }
}

let seed = 3;
function random(): number {
  seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
  return seed / 4294967296;
}

const pairs: Pair[] = [];
for (let i = 0; i < 400; i++) {
  const pair: Pair = { id: i, left: Math.floor(random() * 30), right: Math.floor(random() * 30) };
  if (i % 3 === 0) pair.weight = Math.floor(random() * 5);
  pairs.push(pair);
}
const order = (rows: { id: number }[]): string => rows.map((row) => row.id).join(",");
const hash = (rows: { id: number }[]): number => {
  let h = 0;
  for (const row of rows) h = (Math.imul(h, 31) + row.id) | 0;
  return h;
};

console.log("mixed", hash(pairs.toSorted((a, b) => a.left - b.left || a.right - b.right)));
console.log("scaled", hash(pairs.toSorted((a, b) => (a.left - b.left) * 2)));
console.log("optional", hash(pairs.toSorted((a, b) => (a.weight ?? 0) - (b.weight ?? 0))));
let direction = -1;
console.log("captured", hash(pairs.toSorted((a, b) => direction * (a.left - b.left))));
direction = 1;
console.log("captured-again", hash(pairs.toSorted((a, b) => direction * (a.left - b.left))));
console.log("ternary-two", hash(pairs.toSorted((a, b) => (a.left < b.left ? -2 : a.left > b.left ? 2 : 0))));

function byLeft(a: Pair, b: Pair): number {
  return a.left - b.left;
}
console.log("declared", hash(pairs.toSorted(byLeft)), order(pairs.toSorted(byLeft).slice(0, 12)));

const scores: Score[] = [];
for (let i = 0; i < 64; i++) scores.push(new Score(i, Math.floor(random() * 8)));
const byValue = scores.toSorted((a, b) => a.value - b.value);
let reads = 0;
for (const score of scores) reads += score.reads;
console.log("getter", hash(byValue), reads > 0);

const numbers: number[] = [];
for (let i = 0; i < 300; i++) numbers.push(Math.floor(random() * 40) - 20);
const show = (values: number[]): string => values.slice(0, 20).join(",");
console.log("no-param", show(numbers.toSorted(() => 0)));
console.log("negated", show(numbers.toSorted((a, b) => -(a - b))));
console.log("swapped-sub", show(numbers.toSorted((a, b) => -b + a)));
const reversedSub = (a: number, b: number): number => b - a;
console.log("stored", show(numbers.toSorted(reversedSub)));
console.log("abs", show(numbers.toSorted((a, b) => Math.abs(a) - Math.abs(b))));
