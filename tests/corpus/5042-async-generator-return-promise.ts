// An async generator's `return x` awaits x where the return statement runs,
// before any enclosing finally blocks, and the generator's request settles
// as the body completes. A returned promise therefore takes the same turns
// as a returned value (one turn once it settles), and finally blocks see
// the turn of that await, as in Node.
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

async function* returnValue(): AsyncGenerator<number, number> {
  yield 1;
  return 2;
}

async function* returnSettled(): AsyncGenerator<number, number> {
  yield 1;
  return Promise.resolve(2);
}

async function* returnPending(): AsyncGenerator<number, number> {
  yield 1;
  return later(2);
}

async function* returnFirst(): AsyncGenerator<number, number> {
  return Promise.resolve(5);
}

async function* returnAfterAwait(): AsyncGenerator<number, number> {
  yield 1;
  const base = await later(10);
  return later(base + 1);
}

async function* returnValueFinally(): AsyncGenerator<number, number> {
  yield 1;
  try {
    return 2;
  } finally {
    log.push("finally");
  }
}

async function* returnPromiseFinally(): AsyncGenerator<number, number> {
  yield 1;
  try {
    return Promise.resolve(2);
  } finally {
    log.push("finally");
  }
}

async function* returnPromiseNestedFinally(): AsyncGenerator<number, number> {
  yield 1;
  try {
    try {
      return later(2);
    } finally {
      log.push("inner finally");
    }
  } finally {
    log.push("outer finally");
  }
}

async function* returnPromiseFinallyAwait(): AsyncGenerator<number, number> {
  yield 1;
  try {
    return later(2);
  } finally {
    log.push("finally");
    await null;
    log.push("finally after await");
  }
}

async function* returnPromiseFinallyYield(): AsyncGenerator<number, number> {
  yield 1;
  try {
    return Promise.resolve(2);
  } finally {
    log.push("finally");
    yield 9;
    log.push("after finally yield");
  }
}

async function* returnPromiseFinallyOverride(): AsyncGenerator<number, number> {
  yield 1;
  try {
    return later(2);
  } finally {
    log.push("finally");
    return later(3);
  }
}

async function* returnRejectedCaught(): AsyncGenerator<number, number> {
  yield 1;
  try {
    return laterReject("caught");
  } catch (e) {
    log.push("catch " + (e as Error).message);
    return Promise.resolve(3);
  }
}

async function* returnRejected(): AsyncGenerator<number, number> {
  yield 1;
  try {
    return laterReject("escaped");
  } finally {
    log.push("finally");
  }
}

async function* returnVoidPromise(): AsyncGenerator<number, void> {
  yield 1;
  return Promise.resolve();
}

async function* fallOff(): AsyncGenerator<number, void> {
  yield 1;
  log.push("end");
}

async function settle(name: string): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  console.log(name + ": " + log.join(" "));
  log.length = 0;
}

async function drive(name: string, it: AsyncGenerator<number, number>): Promise<void> {
  ticker("t", 8);
  try {
    for (let k = 0; k < 4; k++) {
      const r = await it.next();
      log.push("next " + r.value + " " + r.done);
      if (r.done) break;
    }
  } catch (e) {
    log.push("rejected " + (e as Error).message);
  }
  await settle(name);
}

async function driveVoid(name: string, it: AsyncGenerator<number, void>): Promise<void> {
  ticker("t", 6);
  for (let k = 0; k < 4; k++) {
    const r = await it.next();
    log.push("next " + r.value + " " + r.done);
    if (r.done) break;
  }
  await settle(name);
}

async function main(): Promise<void> {
  await drive("value", returnValue());
  await drive("settled", returnSettled());
  await drive("pending", returnPending());
  await drive("first", returnFirst());
  await drive("after await", returnAfterAwait());
  await drive("value finally", returnValueFinally());
  await drive("promise finally", returnPromiseFinally());
  await drive("nested finally", returnPromiseNestedFinally());
  await drive("finally await", returnPromiseFinallyAwait());
  await drive("finally yield", returnPromiseFinallyYield());
  await drive("finally override", returnPromiseFinallyOverride());
  await drive("rejected caught", returnRejectedCaught());
  await drive("rejected", returnRejected());
  await driveVoid("void promise", returnVoidPromise());
  await driveVoid("fall off", fallOff());

  // Requests queued before the body runs settle in order, with the
  // returned promise's turn between them.
  const it = returnSettled();
  ticker("q", 6);
  const a = it.next();
  const b = it.next();
  const c = it.next();
  a.then((r) => log.push("a " + r.value + " " + r.done));
  b.then((r) => log.push("b " + r.value + " " + r.done));
  c.then((r) => log.push("c " + r.done));
  await c;
  await settle("queued");

  // return(v) from outside resumes the generator's finally.
  const outside = returnPromiseFinally();
  await outside.next();
  ticker("r", 6);
  const done = await outside.return(7);
  log.push("return " + done.value + " " + done.done);
  await settle("return()");
}

main();
