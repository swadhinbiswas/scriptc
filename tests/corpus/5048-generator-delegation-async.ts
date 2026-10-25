// Delegating sync generators driven from async code, and async
// generators (which keep their fibers) consuming them.
function* letters(prefix: string): Generator<string, number, string> {
  let count = 0;
  let got = yield prefix + "0";
  while (got !== "stop") {
    count++;
    got = yield prefix + count + ":" + got;
  }
  return count;
}
function* both(): Generator<string, string, string> {
  const a = yield* letters("a");
  const b = yield* letters("b");
  return "a=" + a + " b=" + b;
}

const tick = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function driveWithAwaits(): Promise<void> {
  const g = both();
  const sends = ["x", "y", "stop", "z", "stop"];
  let r = g.next("start");
  for (const s of sends) {
    console.log("value", r.value);
    await tick(1);
    r = g.next(s);
  }
  console.log("result", JSON.stringify(r));
}

// An async generator re-yields a delegating sync generator, awaiting
// between values.
function* digits(): Generator<number, void, undefined> {
  yield 1;
  yield 2;
}
function* moreDigits(): Generator<number, void, undefined> {
  yield* digits();
  yield 3;
  yield* digits();
}
async function* slowly(): AsyncGenerator<number, string, undefined> {
  for (const d of moreDigits()) {
    await tick(1);
    yield d * 10;
  }
  return "slowly done";
}

// An async generator with a typed next channel feeding a sync delegation.
async function* feeder(): AsyncGenerator<string, void, string> {
  const g = both();
  let r = g.next("start");
  while (!r.done) {
    const reply = yield r.value;
    await tick(1);
    r = g.next(reply);
  }
  yield "feeder saw " + r.value;
}

// return() and throw() through yield* while an async function drives.
function* guarded(): Generator<number, void, undefined> {
  try {
    yield 1;
    yield 2;
  } catch (e) {
    console.log("guarded caught", (e as Error).message);
    yield -1;
  } finally {
    console.log("guarded finally");
  }
}
function* outerGuarded(): Generator<number, void, undefined> {
  yield* guarded();
  yield 100;
}

async function main(): Promise<void> {
  await driveWithAwaits();

  const seen: number[] = [];
  const s = slowly();
  for (;;) {
    const r = await s.next();
    if (r.done) {
      console.log(seen.join(","), r.value);
      break;
    }
    seen.push(r.value);
  }

  const f = feeder();
  const replies = ["one", "stop", "two", "three", "stop", "end"];
  let fr = await f.next("ignored");
  for (const reply of replies) {
    console.log("feeder", JSON.stringify(fr));
    fr = await f.next(reply);
  }
  console.log("feeder", JSON.stringify(fr));
  console.log("feeder", JSON.stringify(await f.next("after")));

  const g1 = outerGuarded();
  g1.next();
  await tick(1);
  console.log(JSON.stringify(g1.throw(new Error("async throw"))));
  await tick(1);
  console.log(JSON.stringify(g1.next()));
  console.log(JSON.stringify(g1.next()));

  const g2 = outerGuarded();
  g2.next();
  await tick(1);
  console.log(JSON.stringify(g2.return()));

  // Early exit from for await over an async generator closes the sync
  // delegation it is suspended in.
  async function* wrapping(): AsyncGenerator<number, void, undefined> {
    try {
      for (const v of outerGuarded()) yield v;
    } finally {
      console.log("wrapping finally");
    }
  }
  for await (const v of wrapping()) {
    console.log("for await", v);
    break;
  }
}
main().then(() => console.log("main done"));
