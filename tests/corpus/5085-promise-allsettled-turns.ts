// Promise.allSettled over a Promise<T>[] settles from a reaction job on
// each entry, one microtask turn after the entry settles (or after the
// call, for an entry already settled), and fulfills once every entry has
// settled. Settled, pending, rejected, empty, void and nested inputs
// interleave with then-callbacks and queueMicrotask in Node's order, and
// the PromiseSettledResult records narrow on `status`.
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

async function fails(message: string): Promise<number> {
  throw new Error(message);
}

function describe(results: PromiseSettledResult<number>[]): string {
  return results
    .map((r) => (r.status === "fulfilled" ? "ok:" + r.value : "err:" + (r.reason as Error).message))
    .join(",");
}

async function settledEntries(): Promise<void> {
  ticker("a", 5);
  const ps: Promise<number>[] = [Promise.resolve(1), fails("two"), Promise.resolve(3)];
  queueMicrotask(() => log.push("queued"));
  const results = await Promise.allSettled(ps);
  log.push("settled " + describe(results));
}

async function pendingEntries(): Promise<void> {
  ticker("b", 6);
  const ps: Promise<number>[] = [later(1), laterReject("late"), Promise.resolve(3)];
  Promise.allSettled(ps).then((r) => log.push("then " + describe(r)));
  ps[0]!.then(() => log.push("entry0 then"));
  const results = await Promise.allSettled(ps);
  log.push("await " + describe(results));
}

async function emptyInput(): Promise<void> {
  ticker("c", 3);
  const none: Promise<number>[] = [];
  const p = Promise.allSettled(none);
  queueMicrotask(() => log.push("queued"));
  const results = await p;
  log.push("empty " + results.length);
}

async function voidEntries(): Promise<void> {
  ticker("d", 4);
  const tasks: Promise<void>[] = [
    Promise.resolve(),
    (async (): Promise<void> => {
      throw new RangeError("void failed");
    })(),
  ];
  const results = await Promise.allSettled(tasks);
  for (const r of results) {
    if (r.status === "fulfilled") log.push("void fulfilled " + (r.value === undefined));
    else log.push("void rejected " + (r.reason instanceof RangeError));
  }
}

async function nestedInputs(): Promise<void> {
  ticker("e", 7);
  const inner: Promise<number>[] = [Promise.resolve(1), laterReject("inner")];
  const outer = [Promise.allSettled(inner), Promise.allSettled(inner)];
  const results = await Promise.allSettled(outer);
  for (const r of results) {
    if (r.status === "fulfilled") log.push("nested " + describe(r.value));
  }
  const settledAll: Promise<PromiseSettledResult<number>[]>[] = [Promise.allSettled(inner)];
  const all = await Promise.all(settledAll);
  log.push("all of allSettled " + describe(all[0]!));
}

async function stringEntries(): Promise<void> {
  const ps: Promise<string>[] = [
    Promise.resolve("a"),
    (async (): Promise<string> => {
      throw new TypeError("not a string");
    })(),
  ];
  const results = await Promise.allSettled(ps);
  console.log(results[0]);
  const second = results[1]!;
  if (second.status === "rejected") console.log(second.status, (second.reason as Error).name);
  console.log(JSON.stringify(results.map((r) => r.status)));
}

async function timerEntries(): Promise<void> {
  const delay = (ms: number, v: number): Promise<number> =>
    new Promise<number>((resolve) => setTimeout(() => resolve(v), ms));
  const ps: Promise<number>[] = [delay(4, 1), fails("now"), delay(1, 3)];
  const results = await Promise.allSettled(ps);
  console.log(describe(results));
}

async function main(): Promise<void> {
  await settledEntries();
  await pendingEntries();
  await emptyInput();
  await voidEntries();
  await nestedInputs();
  for (const line of log) console.log(line);
  await stringEntries();
  await timerEntries();
}

main();
