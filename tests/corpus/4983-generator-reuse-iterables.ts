// Generator objects are single-pass iterables: a second for-of or spread
// sees only what is left. Generator methods make a fresh generator per
// iteration.
function* range(lo: number, hi: number): Generator<number, void, undefined> {
  for (let i = lo; i < hi; i++) yield i;
}
const g = range(0, 6);
const firstTwo: number[] = [];
for (const x of g) {
  firstTwo.push(x);
  if (firstTwo.length === 2) break;
}
console.log(firstTwo.join(","), [...g].join(","), [...g].length);

const h = range(0, 5);
console.log(h.next().value);
const rest: number[] = [];
for (const x of h) rest.push(x);
console.log(rest.join(","));
for (const x of h) console.log("never", x);

const spread = [...range(10, 15)];
console.log(spread.length, spread.join(","));
console.log(Array.from(range(3, 7)).join(","));
console.log(Math.max(...[...range(1, 9)]));

class Bag {
  private list: string[] = [];
  add(s: string): this {
    this.list.push(s);
    return this;
  }
  *items(): Generator<string, void, undefined> {
    for (const s of this.list) yield s.toUpperCase();
  }
}
const bag = new Bag().add("x").add("y").add("z");
console.log([...bag.items()].join(""), [...bag.items()].join(""));
for (const s of bag.items()) {
  for (const t of bag.items()) process.stdout.write(s + t + " ");
}
console.log();

// The same generator shared by two consumers interleaves.
const shared = range(0, 6);
const left: number[] = [];
const right: number[] = [];
for (const x of shared) {
  left.push(x);
  const n = shared.next();
  if (!n.done) right.push(n.value);
}
console.log(left.join(","), right.join(","));

// Booleans, strings and records through for-of.
function* flags(): Generator<boolean, void, undefined> {
  yield true;
  yield false;
  yield true;
}
let trues = 0;
for (const f of flags()) if (f) trues++;
console.log(trues);
function* points(n: number): Generator<{ x: number; y: number }, void, undefined> {
  for (let i = 0; i < n; i++) yield { x: i, y: i * i };
}
let total = 0;
for (const { x, y } of points(5)) total += x + y;
console.log(total);
function* words(): Generator<string, void, undefined> {
  for (const w of "alpha beta gamma".split(" ")) yield w;
}
console.log([...words()].map((w) => w.length).join(","));
