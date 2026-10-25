// Promise.any over a Promise<T>[] settles from a reaction job on each
// entry: the first fulfillment's job fulfills the result, and once every
// entry has rejected the last job rejects it with an AggregateError
// whose `errors` keep input order. The empty array rejects at once.
// AggregateError also constructs directly, with its message, cause and
// errors list read back through the typed and the narrowed paths.
const log: string[] = [];

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

function messages(error: unknown): string {
  if (!(error instanceof AggregateError)) return "not aggregate";
  const list: string[] = [];
  for (const inner of error.errors) list.push((inner as Error).message);
  return error.name + ": " + error.message + " [" + list.join(",") + "]";
}

async function firstFulfillment(): Promise<void> {
  ticker("a", 5);
  const ps: Promise<number>[] = [laterReject("r0"), later(1), Promise.resolve(2)];
  queueMicrotask(() => log.push("queued"));
  Promise.any(ps).then((v) => log.push("then " + v));
  const v = await Promise.any(ps);
  log.push("await " + v);
}

async function allRejected(): Promise<void> {
  ticker("b", 6);
  const ps: Promise<number>[] = [laterReject("x"), Promise.reject(new Error("y")), laterReject("z")];
  try {
    await Promise.any(ps);
    log.push("unreachable");
  } catch (e) {
    log.push(messages(e));
    log.push("is Error " + (e instanceof Error));
  }
}

async function emptyInput(): Promise<void> {
  ticker("c", 3);
  const none: Promise<string>[] = [];
  const p = Promise.any(none);
  queueMicrotask(() => log.push("queued"));
  p.catch((e: unknown) => log.push("catch " + messages(e)));
  try {
    await p;
  } catch (e) {
    log.push("await " + (e instanceof AggregateError ? e.errors.length : -1));
  }
}

async function nestedInputs(): Promise<void> {
  ticker("d", 6);
  const inner: Promise<number>[] = [laterReject("inner"), later(7)];
  const outer = [Promise.any(inner), Promise.any(inner)];
  log.push("nested " + (await Promise.any(outer)));
  const rejectedOnly: Promise<number>[] = [laterReject("p"), laterReject("q")];
  try {
    await Promise.any([Promise.any(rejectedOnly)]);
  } catch (e) {
    if (e instanceof AggregateError) {
      log.push("outer " + e.errors.length);
      log.push("inner " + messages(e.errors[0]));
    }
  }
}

async function voidEntries(): Promise<void> {
  const tasks: Promise<void>[] = [
    (async (): Promise<void> => {
      throw new Error("first");
    })(),
    Promise.resolve(),
  ];
  await Promise.any(tasks);
  console.log("void any fulfilled");
}

function constructed(): void {
  const e = new AggregateError([new Error("one"), new TypeError("two")], "custom");
  console.log(e.name, e.message, e.errors.length, String(e));
  console.log(e.errors === e.errors, e instanceof AggregateError, e instanceof Error);
  const fromSet = new AggregateError(new Set(["a", "b"]), "from set", { cause: "why" });
  console.log(fromSet.errors.length, fromSet.errors[1], fromSet.cause);
  const bare = new AggregateError([]);
  console.log(JSON.stringify(bare.message), bare.errors.length);
  try {
    throw new AggregateError([1, 2], "thrown");
  } catch (error) {
    if (error instanceof AggregateError) console.log(error.message, error.errors[0], error.errors[1]);
  }
}

async function main(): Promise<void> {
  await firstFulfillment();
  await allRejected();
  await emptyInput();
  await nestedInputs();
  for (const line of log) console.log(line);
  await voidEntries();
  constructed();
}

main();
