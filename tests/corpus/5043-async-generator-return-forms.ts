// The other ways an async generator completes, against then-callbacks:
// a bare `return;` and falling off the end settle as the body completes,
// `return undefined` awaits its operand, and methods, generators driving
// other generators, and for-await loops see the same turns.
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

async function settle(name: string): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  console.log(name + ": " + log.join(" "));
  log.length = 0;
}

async function* bareReturn(stop: boolean): AsyncGenerator<number, void> {
  yield 1;
  if (stop) return;
  log.push("not stopped");
}

async function* bareReturnFinally(): AsyncGenerator<number, void> {
  yield 1;
  try {
    return;
  } finally {
    log.push("finally");
  }
}

async function* returnUndefined(): AsyncGenerator<number, void> {
  yield 1;
  return undefined;
}

async function* returnUndefinedFinally(): AsyncGenerator<number, void> {
  yield 1;
  try {
    return undefined;
  } finally {
    log.push("finally");
  }
}

async function* returnCaughtValue(): AsyncGenerator<number, number> {
  yield 1;
  try {
    return 2;
  } catch {
    return 0;
  }
}

async function* inner(): AsyncGenerator<number, number> {
  yield 1;
  return later(20);
}

async function* outer(): AsyncGenerator<number, number> {
  const it = inner();
  let r = await it.next();
  while (r.done !== true) {
    yield r.value;
    r = await it.next();
  }
  log.push("inner returned " + r.value);
  return Promise.resolve(r.value + 1);
}

class Source {
  readonly base: number;

  constructor(base: number) {
    this.base = base;
  }

  async *values(): AsyncGenerator<number, number> {
    yield this.base;
    try {
      return later(this.base + 1);
    } finally {
      log.push("method finally");
    }
  }
}

async function* counted(n: number): AsyncGenerator<number, number> {
  for (let i = 0; i < n; i++) yield i;
  return Promise.resolve(n);
}

async function drive(name: string, it: AsyncGenerator<number, number>): Promise<void> {
  ticker("t", 8);
  for (let k = 0; k < 4; k++) {
    const r = await it.next();
    log.push("next " + r.value + " " + r.done);
    if (r.done) break;
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
  await driveVoid("bare return", bareReturn(true));
  await driveVoid("no return", bareReturn(false));
  await driveVoid("bare return finally", bareReturnFinally());
  await driveVoid("return undefined", returnUndefined());
  await driveVoid("return undefined finally", returnUndefinedFinally());
  await drive("return caught value", returnCaughtValue());
  await drive("driving", outer());
  await drive("method", new Source(4).values());

  ticker("t", 10);
  let sum = 0;
  for await (const v of counted(3)) {
    log.push("got " + v);
    sum += v;
  }
  log.push("for await " + sum);
  await settle("for await");

  ticker("t", 8);
  for await (const v of new Source(7).values()) {
    log.push("got " + v);
    break;
  }
  log.push("after break");
  await settle("for await break");
}

main();
