// yield* over generators, iterable objects and iterable classes, with
// delegate return values, forwarded next(v), and return() arriving while
// delegated.
function* letters(): Generator<string, number, undefined> {
  yield "a";
  yield "b";
  return 2;
}
const literal = {
  *[Symbol.iterator]() {
    yield 10;
    yield 20;
    yield 30;
  },
};
function* fromObject(): Generator<number, void, undefined> {
  yield* literal;
  yield* literal;
}
class Countdown {
  private from: number;
  constructor(from: number) {
    this.from = from;
  }
  *[Symbol.iterator](): Generator<number, void, undefined> {
    for (let i = this.from; i > 0; i--) yield i;
  }
}
function* fromCustom(): Generator<number, void, undefined> {
  yield* new Countdown(3);
  yield* new Countdown(2);
}
function* chained(): Generator<string, void, undefined> {
  const count = yield* letters();
  yield "count=" + count;
  const again = yield* letters();
  yield "again=" + again;
}
console.log([...fromObject()].join(","));
console.log([...fromCustom()].join(","));
console.log([...chained()].join(" "));

// Deep delegation chain.
function* depth(n: number): Generator<number, void, undefined> {
  if (n === 0) return;
  yield n;
  yield* depth(n - 1);
  yield -n;
}
let sum = 0;
let count = 0;
for (const x of depth(200)) {
  sum += x * count;
  count++;
}
console.log(count, sum);

// Recursive tree walk.
type Tree = { value: number; kids: Tree[] };
function build(d: number, seed: number): Tree {
  const kids: Tree[] = [];
  if (d > 0) for (let i = 0; i < 3; i++) kids.push(build(d - 1, seed * 3 + i));
  return { value: seed, kids };
}
function* walk(t: Tree): Generator<number, void, undefined> {
  yield t.value;
  for (const k of t.kids) yield* walk(k);
}
let acc = 0;
let nodes = 0;
for (const v of walk(build(6, 1))) {
  acc = (acc * 31 + v) % 1000003;
  nodes++;
}
console.log(nodes, acc);

// next(v) forwards into a delegated generator.
function* echo(): Generator<string, string, any> {
  let got = yield "ready";
  while (got !== "stop") got = yield "echo:" + got;
  return "echo done";
}
function* wrapper(): Generator<string, string, any> {
  const r = yield* echo();
  yield "wrapper saw " + r;
  return "wrapped";
}
const w = wrapper();
console.log(w.next("ignored").value);
console.log(w.next("one").value);
console.log(w.next("two").value);
console.log(w.next("stop").value);
console.log(JSON.stringify(w.next("after")));

// return() while suspended inside yield*: the outer finally runs.
function* guarded(): Generator<number, void, undefined> {
  try {
    yield* new Countdown(3);
  } finally {
    console.log("guarded finally");
  }
}
const gd = guarded();
console.log(gd.next().value);
console.log(JSON.stringify(gd.return()));
