import { Worker, isMainThread, parentPort } from "node:worker_threads";

// Every way an exception can be raised, moved, consumed or discarded, run on
// the main thread and in a worker of the same program. After each scenario a
// call that may throw but does not proves that nothing is left pending: a
// stale pending state would unwind it.

class Fault extends Error {
  readonly code: number;
  constructor(code: number) {
    super(`fault ${code}`);
    this.name = "Fault";
    this.code = code;
  }
}

function fail(code: number): never {
  throw new Fault(code);
}

function label(code: number): string {
  if (code < 0) fail(-code);
  return `item-${code}`;
}

function message(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

function finallyReturns(): string {
  try {
    fail(1);
  } finally {
    return "finally return";
  }
}

function finallyBreaks(log: string[]): number {
  let rounds = 0;
  for (let i = 0; i < 3; i++) {
    rounds++;
    try {
      fail(2);
    } finally {
      log.push(`break round ${i}`);
      break;
    }
  }
  return rounds;
}

function finallyContinues(log: string[]): number {
  let rounds = 0;
  for (let i = 0; i < 3; i++) {
    try {
      if (i !== 1) fail(3);
      rounds += 10;
    } finally {
      rounds++;
      continue;
    }
  }
  log.push(`continue rounds ${rounds}`);
  return rounds;
}

function finallyReplaces(): string {
  try {
    fail(4);
  } finally {
    label(-5);
  }
}

function deep(n: number, log: string[]): string {
  if (n === 0) fail(6);
  try {
    return deep(n - 1, log);
  } finally {
    if (n % 2 === 0) log.push(`unwound ${n}`);
  }
}

function catchRethrows(): string {
  try {
    return label(-7);
  } catch (error) {
    try {
      fail((error as Fault).code + 1);
    } catch (inner) {
      throw new Fault((inner as Fault).code * 10);
    }
  }
}

function labelled(log: string[]): number {
  let caught = 0;
  outer: for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      try {
        if (j === 1) fail(i * 3 + j);
      } catch {
        caught++;
        continue outer;
      }
    }
  }
  log.push(`labelled caught ${caught}`);
  return caught;
}

function* resumable(log: string[]): Generator<string, string, string> {
  let round = 0;
  while (round < 3) {
    try {
      const sent = yield `round ${round}`;
      log.push(`sent ${sent}`);
    } catch (error) {
      log.push(`generator caught ${message(error)}`);
    }
    round++;
  }
  return "generator done";
}

function* guarded(log: string[]): Generator<number> {
  try {
    yield 1;
    yield 2;
  } finally {
    log.push("guarded finally");
  }
}

function* explosive(): Generator<number> {
  yield 1;
  fail(8);
}

function* finallyThrows(): Generator<number> {
  try {
    yield 1;
  } finally {
    fail(9);
  }
}

async function rejectsLater(code: number): Promise<string> {
  await null;
  return label(-code);
}

async function rejectsNow(code: number): Promise<string> {
  return label(-code);
}

function overflow(n: number): number {
  return overflow(n + 1) + 1;
}

async function scenarios(): Promise<string[]> {
  const log: string[] = [];
  const attempt = (name: string, run: () => unknown): void => {
    try {
      log.push(`${name} ${String(run())}`);
    } catch (error) {
      log.push(`${name} caught ${message(error)}`);
    }
    log.push(`${name} then ${label(name.length)}`);
  };

  attempt("bound catch", () => {
    try {
      return label(-10);
    } catch (error) {
      return `took ${(error as Fault).code}`;
    }
  });
  attempt("bare catch", () => {
    try {
      return label(-11);
    } catch {
      return "dropped";
    }
  });
  attempt("finally return", finallyReturns);
  attempt("finally break", () => finallyBreaks(log));
  attempt("finally continue", () => finallyContinues(log));
  attempt("finally replace", finallyReplaces);
  attempt("deep", () => deep(5, log));
  attempt("catch rethrow", catchRethrows);
  attempt("labelled", () => labelled(log));

  const gen = resumable(log);
  log.push(`next ${gen.next("ignored").value}`);
  log.push(`next ${gen.next("a").value}`);
  log.push(`throw ${gen.throw(new Fault(12)).value}`);
  const last = gen.next("b");
  log.push(`last ${last.value} ${last.done}`);
  log.push(`after generator ${label(13)}`);

  const guard = guarded(log);
  guard.next();
  const returned = guard.return(99);
  log.push(`return ${returned.value} ${returned.done}`);
  for (const value of guarded(log)) {
    log.push(`for-of ${value}`);
    break;
  }
  attempt("generator escape", () => [...explosive()].length);
  attempt("generator finally throw", () => {
    const g = finallyThrows();
    g.next();
    return g.return(0).value;
  });

  try {
    await rejectsLater(14);
  } catch (error) {
    log.push(`await caught ${message(error)}`);
  }
  log.push(`after await ${label(15)}`);
  await rejectsNow(16).catch((error: unknown) => log.push(`catch handler ${message(error)}`));
  const statuses: string[] = [];
  for (const pending of [rejectsLater(17), Promise.resolve("ok"), rejectsNow(18)]) {
    try {
      statuses.push(`fulfilled ${await pending}`);
    } catch (error) {
      statuses.push(`rejected ${(error as Fault).code}`);
    }
  }
  log.push(`settled ${statuses.join(",")}`);
  try {
    await Promise.all([rejectsLater(19), rejectsLater(20)]);
  } catch (error) {
    log.push(`all caught ${message(error)}`);
  }
  try {
    await new Promise<string>(() => fail(21));
  } catch (error) {
    log.push(`executor caught ${message(error)}`);
  }
  const chained = await Promise.resolve(1)
    .then(() => fail(22))
    .then(
      () => "unexpected",
      (error: unknown) => `then rejected ${message(error)}`,
    );
  log.push(chained);
  log.push(`after promises ${label(23)}`);

  attempt("map callback", () => [1, 2, 3].map((n) => label(n === 2 ? -24 : n)).join());
  attempt("sort comparator", () =>
    [3, 1, 2]
      .sort((a, b) => {
        if (a === 1 || b === 1) fail(25);
        return a - b;
      })
      .join(),
  );
  attempt("reduce", () => [1, 2, 3].reduce((acc, n) => acc + label(n === 3 ? -26 : n), ""));
  attempt("forEach", () => {
    let seen = 0;
    try {
      [1, 2, 3].forEach((n) => {
        seen++;
        if (n === 2) fail(27);
      });
    } finally {
      log.push(`forEach seen ${seen}`);
    }
    return seen;
  });
  attempt("json", () => {
    try {
      return JSON.parse("{bad");
    } catch (error) {
      return `parse failed ${(error as Error).name}`;
    }
  });
  attempt("overflow", () => overflow(0));
  attempt("nested callbacks", () =>
    [1, 2].map((n) => {
      try {
        return [n].map(() => label(-28))[0];
      } catch (error) {
        return `inner ${(error as Fault).code}`;
      }
    }),
  );
  return log;
}

if (isMainThread) {
  for (const line of await scenarios()) console.log("main", line);
  await new Promise<void>((resolve) => {
    const worker = new Worker(new URL(import.meta.url));
    worker.on("message", (lines: string[]) => {
      for (const line of lines) console.log("worker", line);
    });
    worker.once("exit", (code: number) => {
      console.log("worker exit", code);
      resolve();
    });
  });
} else {
  parentPort!.postMessage(await scenarios());
}
