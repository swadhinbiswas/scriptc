// `return p` inside try statements of an async function: the return
// completes first (p is evaluated, then every crossed finally runs), and
// only then does the function's promise adopt p's settlement. A rejected p
// therefore rejects the function's promise without reaching its own catch
// clauses, while `return await p` is still caught.
const log: string[] = [];

function ticks(tag: string, n: number): Promise<void> {
  let p = Promise.resolve();
  for (let i = 0; i < n; i++) {
    const k = i;
    p = p.then(() => {
      log.push(tag + k);
    });
  }
  return p;
}

async function leaf(x: number): Promise<number> {
  return x + 1;
}
async function slow(x: number): Promise<number> {
  await null;
  await null;
  return x + 1;
}
async function boom(message: string): Promise<number> {
  throw new Error(message);
}
async function boomLater(message: string): Promise<number> {
  await null;
  throw new Error(message);
}

async function catchOnly(): Promise<number> {
  try {
    return leaf(1);
  } catch {
    log.push("never");
    return -1;
  }
}
async function catchMissesRejection(): Promise<number> {
  try {
    return boom("not caught");
  } catch {
    log.push("caught?");
    return -1;
  }
}
async function catchMissesLateRejection(): Promise<number> {
  try {
    return boomLater("not caught later");
  } catch {
    log.push("caught?");
    return -1;
  }
}
async function catchSeesAwaitedRejection(): Promise<number> {
  try {
    return await boom("awaited");
  } catch (e) {
    log.push("caught " + (e as Error).message);
    return -1;
  }
}
async function finallyBeforeAdoption(): Promise<number> {
  try {
    return leaf(5);
  } finally {
    log.push("finally");
  }
}
async function finallyAfterAwait(): Promise<number> {
  try {
    return await leaf(5);
  } finally {
    log.push("finally-await");
  }
}
async function finallyWithRejection(): Promise<number> {
  try {
    return boom("through finally");
  } finally {
    log.push("finally-rej");
  }
}
async function finallyWithPending(): Promise<number> {
  try {
    return slow(1);
  } finally {
    log.push("finally-pending");
  }
}
async function catchAndFinally(): Promise<number> {
  try {
    return boom("both");
  } catch {
    log.push("caught?");
    return -1;
  } finally {
    log.push("finally-both");
  }
}
async function nested(): Promise<number> {
  try {
    try {
      return leaf(2);
    } finally {
      log.push("inner");
    }
  } catch {
    log.push("never");
    return -1;
  } finally {
    log.push("outer");
  }
}
async function finallyThrows(): Promise<number> {
  try {
    return leaf(3);
  } finally {
    log.push("finally-throws");
    throw new Error("from finally");
  }
}
async function finallyReturnsValue(): Promise<number> {
  try {
    return slow(3);
  } finally {
    log.push("finally-value");
    return 99;
  }
}
async function finallyReturnsPromise(): Promise<number> {
  try {
    return slow(3);
  } finally {
    log.push("finally-promise");
    return leaf(50);
  }
}
async function finallyAwaits(): Promise<number> {
  try {
    return leaf(4);
  } finally {
    log.push("finally-awaits");
    await null;
    log.push("finally-resumed");
  }
}
async function returnInCatch(): Promise<number> {
  try {
    await boom("first");
    return 0;
  } catch {
    log.push("in-catch");
    return leaf(7);
  }
}
async function returnInCatchRejects(): Promise<number> {
  try {
    await boom("first");
    return 0;
  } catch {
    log.push("in-catch");
    return boom("second");
  } finally {
    log.push("after-catch");
  }
}
async function returnInLoop(n: number): Promise<number> {
  for (let i = 0; i < n; i++) {
    try {
      if (i === 2) return leaf(i);
    } finally {
      log.push("loop" + i);
    }
  }
  return 0;
}
async function returnAfterTry(): Promise<number> {
  let r = 0;
  try {
    r = await leaf(1);
  } finally {
    log.push("try-done");
  }
  return leaf(r);
}
async function relayThroughTry(): Promise<number> {
  try {
    return finallyBeforeAdoption();
  } finally {
    log.push("relay-finally");
  }
}

async function run(name: string, f: () => Promise<number>): Promise<void> {
  log.length = 0;
  const chain = ticks("t", 12);
  f().then(
    (v) => {
      log.push("R" + v);
    },
    (e) => {
      log.push("E:" + (e as Error).message);
    },
  );
  queueMicrotask(() => {
    log.push("q");
  });
  await chain;
  console.log(name.padEnd(26), log.join(" "));
}

async function main(): Promise<void> {
  await run("catchOnly", catchOnly);
  await run("catchMissesRejection", catchMissesRejection);
  await run("catchMissesLateRejection", catchMissesLateRejection);
  await run("catchSeesAwaitedRejection", catchSeesAwaitedRejection);
  await run("finallyBeforeAdoption", finallyBeforeAdoption);
  await run("finallyAfterAwait", finallyAfterAwait);
  await run("finallyWithRejection", finallyWithRejection);
  await run("finallyWithPending", finallyWithPending);
  await run("catchAndFinally", catchAndFinally);
  await run("nested", nested);
  await run("finallyThrows", finallyThrows);
  await run("finallyReturnsValue", finallyReturnsValue);
  await run("finallyReturnsPromise", finallyReturnsPromise);
  await run("finallyAwaits", finallyAwaits);
  await run("returnInCatch", returnInCatch);
  await run("returnInCatchRejects", returnInCatchRejects);
  await run("returnInLoop", () => returnInLoop(4));
  await run("returnAfterTry", returnAfterTry);
  await run("relayThroughTry", relayThroughTry);
}

void main();
