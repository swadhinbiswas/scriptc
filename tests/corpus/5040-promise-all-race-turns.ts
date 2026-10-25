// Promise.all and Promise.race settle their result from a reaction job on
// each entry, one microtask turn after the entry settles (or after the
// call, for an entry already settled). Settled and pending entries,
// fulfillments and rejections interleave with then-callbacks and
// queueMicrotask in Node's order.
const log: string[] = [];

// A then-chain that logs one step per microtask turn.
function ticker(label: string, steps: number): void {
  let i = 0;
  const step = (): void => {
    log.push(label + i);
    i++;
    if (i < steps) Promise.resolve().then(step);
  };
  Promise.resolve().then(step);
}

function later(value: number): Promise<number> {
  return new Promise<number>((resolve) => queueMicrotask(() => resolve(value)));
}

function laterReject(message: string): Promise<number> {
  return new Promise<number>((_, reject) => queueMicrotask(() => reject(new Error(message))));
}

async function allSettledEntries(): Promise<void> {
  ticker("a", 5);
  const ps: Promise<number>[] = [Promise.resolve(1), Promise.resolve(2)];
  const values = await Promise.all(ps);
  log.push("all settled " + values.join(","));
}

async function allPendingEntries(): Promise<void> {
  ticker("b", 6);
  const ps: Promise<number>[] = [later(1), Promise.resolve(2), later(3)];
  const values = await Promise.all(ps);
  log.push("all pending " + values.join(","));
}

async function allRejected(): Promise<void> {
  ticker("c", 6);
  const ps: Promise<number>[] = [later(1), laterReject("no"), Promise.resolve(3)];
  try {
    await Promise.all(ps);
  } catch (e) {
    log.push("all rejected " + (e as Error).message);
  }
}

async function allSettledRejection(): Promise<void> {
  ticker("l", 5);
  const first: Promise<number> = Promise.reject(new Error("first"));
  const second: Promise<number> = Promise.reject(new Error("second"));
  const ps: Promise<number>[] = [Promise.resolve(1), first, later(2), second];
  const all = Promise.all(ps);
  all.then(
    () => log.push("not reached"),
    (e) => log.push("then rejected " + (e as Error).message),
  );
  try {
    await all;
  } catch (e) {
    log.push("all settled rejection " + (e as Error).message);
  }
}

async function allVoid(): Promise<void> {
  ticker("d", 5);
  const ps: Promise<void>[] = [Promise.resolve(), new Promise<void>((r) => queueMicrotask(r))];
  await Promise.all(ps);
  log.push("all void");
}

async function allEmpty(): Promise<void> {
  ticker("e", 4);
  const ps: Promise<number>[] = [];
  const values = await Promise.all(ps);
  log.push("all empty " + values.length);
}

async function raceSettled(): Promise<void> {
  ticker("f", 5);
  const winner = await Promise.race([Promise.resolve(1), Promise.resolve(2)]);
  log.push("race settled " + winner);
}

async function racePending(): Promise<void> {
  ticker("g", 6);
  const winner = await Promise.race([later(1), later(2)]);
  log.push("race pending " + winner);
}

async function raceRejected(): Promise<void> {
  ticker("h", 6);
  try {
    await Promise.race([laterReject("lost"), later(2)]);
  } catch (e) {
    log.push("race rejected " + (e as Error).message);
  }
}

async function raceSettledRejection(): Promise<void> {
  ticker("i", 5);
  const rejected: Promise<number> = Promise.reject(new Error("first"));
  try {
    await Promise.race([rejected, Promise.resolve(2)]);
  } catch (e) {
    log.push("race settled rejection " + (e as Error).message);
  }
}

// Reactions on one entry run in subscription order, whether they come
// from then, await, or the combinator.
async function sharedEntry(): Promise<void> {
  ticker("j", 6);
  const shared = later(7);
  shared.then((v) => {
    log.push("then before " + v);
    queueMicrotask(() => log.push("micro before"));
  });
  const ps: Promise<number>[] = [shared];
  const all = Promise.all(ps);
  const race = Promise.race([shared]);
  shared.then((v) => {
    log.push("then after " + v);
    queueMicrotask(() => log.push("micro after"));
  });
  all.then((vs) => log.push("all then " + vs.join(",")));
  race.then((v) => log.push("race then " + v));
  const [first] = await all;
  log.push("shared all " + first + " race " + (await race));
}

async function nested(): Promise<void> {
  ticker("k", 8);
  const inner: Promise<number[]>[] = [
    Promise.all([Promise.resolve(1), later(2)] as Promise<number>[]),
    Promise.all([later(3)] as Promise<number>[]),
  ];
  const outer = await Promise.all(inner);
  log.push("nested " + outer.map((vs) => vs.join("+")).join(","));
  const winner = await Promise.race([Promise.race([later(4)]), later(5)]);
  log.push("nested race " + winner);
}

async function main(): Promise<void> {
  const cases: (() => Promise<void>)[] = [
    allSettledEntries,
    allPendingEntries,
    allRejected,
    allSettledRejection,
    allVoid,
    allEmpty,
    raceSettled,
    racePending,
    raceRejected,
    raceSettledRejection,
    sharedEntry,
    nested,
  ];
  for (const run of cases) {
    log.length = 0;
    await run();
    // Let the tickers finish before printing the case.
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    console.log(log.join(" "));
  }
  // Concurrent: two combinators racing each other's turns.
  log.length = 0;
  const left = Promise.all([later(1), Promise.resolve(2)] as Promise<number>[]).then((vs) =>
    log.push("left " + vs.join(",")),
  );
  const right = Promise.race([later(3), Promise.resolve(4)]).then((v) => log.push("right " + v));
  queueMicrotask(() => log.push("micro 1"));
  Promise.resolve().then(() => queueMicrotask(() => log.push("micro 2")));
  await left;
  await right;
  console.log(log.join(" "));
}

main();
