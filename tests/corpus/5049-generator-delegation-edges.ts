// yield* edge cases: started and finished delegates, shared delegates,
// re-entrancy, deep typed chains, and generator methods.
function* counter(): Generator<number, string, unknown> {
  let i = 0;
  for (;;) {
    const got = yield i++;
    if (got === "quit") return "counter quit at " + i;
    console.log("counter got", JSON.stringify(got));
  }
}
// A started delegate with a dyn next channel receives undefined first.
function* resumeStarted(c: Generator<number, string, unknown>): Generator<number, string, string> {
  const r = yield* c;
  return "resumeStarted: " + r;
}
const started = counter();
started.next();
started.next("before");
const rs = resumeStarted(started);
console.log(JSON.stringify(rs.next("first")));
console.log(JSON.stringify(rs.next("second")));
console.log(JSON.stringify(rs.next("quit")));

// A finished delegate completes yield* at once with undefined.
function* short(): Generator<number, string | undefined, undefined> {
  yield 1;
  return "short done";
}
function* overFinished(
  g: Generator<number, string | undefined, undefined>,
): Generator<number, string, undefined> {
  const r = yield* g;
  return "got " + String(r);
}
const done = short();
done.next();
console.log(JSON.stringify(done.next()));
console.log(JSON.stringify(overFinished(done).next()));

// Two outers sharing one delegate.
function* shared(): Generator<string, void, undefined> {
  yield "s1";
  yield "s2";
  yield "s3";
  yield "s4";
}
function* take(src: Generator<string, void, undefined>, tag: string): Generator<string, void, undefined> {
  yield* src;
  yield tag + " end";
}
const src = shared();
const left = take(src, "left");
const right = take(src, "right");
console.log(left.next().value, right.next().value, left.next().value, right.next().value);
console.log(JSON.stringify(left.next()), JSON.stringify(right.next()));

// Delegating to the running generator itself throws a TypeError.
function* selfish(): Generator<number, void, undefined> {
  yield 1;
  try {
    yield* me;
  } catch (e) {
    console.log("selfish", e instanceof TypeError, (e as Error).message);
  }
}
const me = selfish();
me.next();
console.log(JSON.stringify(me.next()));

// A deep chain of typed delegations.
function* chain(n: number): Generator<number, number, number> {
  if (n === 0) {
    const v = yield 0;
    return v;
  }
  const below = yield* chain(n - 1);
  return below + n;
}
const deep = chain(300);
console.log(JSON.stringify(deep.next(-1)));
console.log(JSON.stringify(deep.next(1000)));

// Generator methods delegating through this.
class Bag {
  private items: string[];
  constructor(items: string[]) {
    this.items = items;
  }
  *each(): Generator<string, number, string> {
    let replies = 0;
    for (const item of this.items) {
      const reply = yield item;
      if (reply.length > 0) replies++;
    }
    return replies;
  }
  *twice(): Generator<string, number, string> {
    const a = yield* this.each();
    const b = yield* this.each();
    return a * 10 + b;
  }
}
function driveBag(): void {
  const bag = new Bag(["p", "q"]);
  const it = bag.twice();
  const replies = ["", "r1", "r2", "", "r3"];
  let r = it.next("unused");
  const out: string[] = [];
  let k = 0;
  while (!r.done) {
    out.push(r.value);
    r = it.next(replies[k++]);
  }
  console.log(out.join(","), r.value);
}
driveBag();

// yield* of a delegate produced by a call expression and a conditional.
function* evens(): Generator<number, void, undefined> {
  yield 2;
  yield 4;
}
function* odds(): Generator<number, void, undefined> {
  yield 1;
  yield 3;
}
function pick(even: boolean): Generator<number, void, undefined> {
  return even ? evens() : odds();
}
function* picked(): Generator<number, void, undefined> {
  yield* pick(true);
  yield* pick(false);
  yield* (Math.random() < 2 ? evens() : odds());
}
console.log([...picked()].join(","));

// Values cross yield and return channels of different types.
function* narrow(): Generator<number, boolean, undefined> {
  yield 1;
  return true;
}
function* wide(): Generator<number | string, string, undefined> {
  const flag = yield* narrow();
  yield "flag " + flag;
  return "wide";
}
console.log([...wide()].join(","));
const wd = wide();
wd.next();
console.log(JSON.stringify(wd.return("cut")));
