// Generators that call callback parameters on every step: a single known
// callback (entered directly), several callbacks (entered through the
// closure), callbacks that read `this`, throw, re-enter the running
// generator or close the consumer, plus parameters that are rebound or
// captured inside the body, early exits with finally, return() and
// throw() while suspended inside `yield f(v)`, and async generators.
function* range(start: number, end: number): Generator<number> {
  for (let i = start; i < end; i++) yield i;
}

function* mapGen(it: Generator<number>, f: (x: number) => number): Generator<number> {
  for (const v of it) yield f(v);
}

let total = 0;
for (let r = 0; r < 3; r++)
  for (const v of mapGen(range(0, 50), function (x: number): number {
    return x % 7;
  }))
    total += v;
console.log("known", total);

// Two call sites with different callbacks: no single target.
function* mapTwice(it: Generator<number>, f: (x: number) => string): Generator<string> {
  for (const v of it) yield f(v) + f(v + 100);
}
const outA: string[] = [];
for (const s of mapTwice(range(0, 3), (x) => "a" + x)) outA.push(s);
for (const s of mapTwice(range(0, 2), (x) => "b" + x * 2)) outA.push(s);
console.log("two", outA.join(","));

// A callback that reads `this`: a plain call binds undefined.
function* thisGen(f: (x: number) => string): Generator<string> {
  yield f(1);
  yield f(2);
}
const seen: string[] = [];
for (const s of thisGen(function (this: unknown, x: number): string {
  return typeof this + ":" + x;
}))
  seen.push(s);
console.log("this", seen.join(","));

// A callback that throws: the finally blocks of both generators run and
// the exception reaches the consumer.
function* guarded(it: Generator<number>, f: (x: number) => number): Generator<number> {
  try {
    for (const v of it) yield f(v);
  } finally {
    console.log("guarded finally");
  }
}
function* source(n: number): Generator<number> {
  try {
    for (let i = 0; i < n; i++) yield i;
  } finally {
    console.log("source finally");
  }
}
try {
  for (const v of guarded(source(10), (x: number): number => {
    if (x === 3) throw new Error("boom at " + x);
    return x * 10;
  }))
    console.log("got", v);
} catch (e) {
  console.log("caught", (e as Error).message);
}

// Early exit from the consumer while the callback result is pending.
for (const v of guarded(source(10), (x: number): number => x + 1)) {
  console.log("early", v);
  if (v === 2) break;
}

// return() and throw() while suspended at `yield f(v)`.
const g1 = guarded(source(5), (x: number): number => x * 3);
console.log(JSON.stringify(g1.next()), JSON.stringify(g1.next()));
console.log(JSON.stringify(g1.return(99)), JSON.stringify(g1.next()));
const g2 = guarded(source(5), (x: number): number => x * 4);
console.log(JSON.stringify(g2.next()));
try {
  g2.throw(new Error("injected"));
} catch (e) {
  console.log("rethrown", (e as Error).message);
}
console.log(JSON.stringify(g2.next()));

// Re-entering the running generator from its callback.
function* reenter(f: (x: number) => number): Generator<number> {
  yield f(1);
}
const running: Generator<number> = reenter((x: number): number => {
  try {
    running.next();
  } catch (e) {
    console.log("reentry", (e as Error).name, (e as Error).message);
  }
  return x;
});
for (const v of running) console.log("reenter value", v);

// The callback rebinds the consumer's only named reference mid-iteration.
function* dropper(f: (x: number) => number): Generator<number> {
  for (let i = 0; i < 4; i++) yield f(i);
}
function* empty(): Generator<number> {}
let held: Generator<number> = dropper((x: number): number => {
  if (x === 1) held = empty();
  return x * x;
});
const squares: number[] = [];
for (const v of held) squares.push(v);
console.log("dropped", squares.join(","));
held = dropper((x: number): number => {
  if (x === 2) held = empty();
  return x + 1;
});
const viaNext: string[] = [];
for (let i = 0; i < 6; i++) viaNext.push(JSON.stringify(held.next()));
console.log("dropped next", viaNext.join(" "));

// A parameter rebound inside the body, and one captured by a closure.
function* rebinding(f: (x: number) => number): Generator<number> {
  yield f(1);
  f = (x: number): number => -x;
  yield f(2);
}
console.log("rebound", [...rebinding((x: number): number => x * 100)].join(","));
function* capturing(f: (x: number) => number): Generator<() => number> {
  for (let i = 0; i < 3; i++) yield () => f(i);
}
console.log(
  "captured",
  [...capturing((x: number): number => x + 0.5)].map((thunk) => thunk()).join(","),
);

// Strings flow through a borrowed parameter across suspensions.
function* label(prefix: string, it: Generator<number>): Generator<string> {
  for (const v of it) yield prefix + v;
}
console.log("label", [...label("n", range(0, 4))].join(" "));

// A generator abandoned mid-iteration keeps its callback alive.
const abandoned = mapGen(range(0, 100), (x: number): number => x + 1000);
console.log("abandoned", abandoned.next().value, abandoned.next().value);

// An async generator with one known callback.
async function* asyncMap(xs: number[], f: (x: number) => number): AsyncGenerator<number> {
  for (const x of xs) {
    await null;
    yield f(x);
  }
}
async function main(): Promise<void> {
  const out: number[] = [];
  for await (const v of asyncMap([1, 2, 3], (x: number): number => x * 11)) out.push(v);
  console.log("async", out.join(","));
}
main().then(() => console.log("done"));
