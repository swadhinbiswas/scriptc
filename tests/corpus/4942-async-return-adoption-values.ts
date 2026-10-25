// Returned-promise adoption across result kinds and function forms:
// strings, records, booleans, arrays, void results, class methods, nested
// closures, concise arrows (including void-typed ones), and then/catch/
// finally handlers that return promises.
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

interface Point {
  x: number;
  y: number;
}

async function leaf(x: number): Promise<number> {
  return x + 1;
}
async function slow(x: number): Promise<number> {
  await null;
  await null;
  return x + 1;
}
async function text(n: number): Promise<string> {
  return "s" + n;
}
async function slowText(n: number): Promise<string> {
  await null;
  return "z" + n;
}
async function point(n: number): Promise<Point> {
  return { x: n, y: n * 2 };
}
async function flag(n: number): Promise<boolean> {
  return n > 0;
}
async function list(n: number): Promise<number[]> {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(i);
  return out;
}
async function quiet(): Promise<void> {
  log.push("quiet");
}
async function quietLater(): Promise<void> {
  await null;
  log.push("quiet-later");
}
async function quietBoom(): Promise<void> {
  throw new Error("void rejection");
}
async function boom(message: string): Promise<number> {
  throw new Error(message);
}

async function returnText(): Promise<string> {
  try {
    return text(1);
  } finally {
    log.push("text-finally");
  }
}
async function returnSlowText(): Promise<string> {
  return slowText(2);
}
async function returnPoint(): Promise<Point> {
  return point(4);
}
async function returnPointInTry(): Promise<Point> {
  try {
    return point(5);
  } finally {
    log.push("point-finally");
  }
}
async function returnFlag(): Promise<boolean> {
  return flag(1);
}
async function returnList(): Promise<number[]> {
  return list(3);
}
async function returnVoid(): Promise<void> {
  return quiet();
}
async function returnVoidLater(): Promise<void> {
  try {
    return quietLater();
  } finally {
    log.push("void-finally");
  }
}
async function returnVoidRejection(): Promise<void> {
  try {
    return quietBoom();
  } catch {
    log.push("caught?");
  }
}

class Service {
  base = 3;
  async get(x: number): Promise<number> {
    return x + this.base;
  }
  async relay(x: number): Promise<number> {
    return this.get(x);
  }
  async relayInTry(x: number): Promise<number> {
    try {
      return this.get(x);
    } finally {
      log.push("service-finally");
    }
  }
}
const service = new Service();

async function viaClosure(k: number): Promise<number> {
  const f = async (): Promise<number> => {
    try {
      return leaf(k);
    } finally {
      log.push("closure" + k);
    }
  };
  return f();
}
const conciseArrow = async (): Promise<number> => leaf(10);
const conciseSlowArrow = async (): Promise<number> => slow(10);
const conciseVoidArrow = async (): Promise<void> => quietLater();
const conciseVoidRejection = async (): Promise<void> => quietBoom();

function thenReturnsPromise(): Promise<number> {
  return Promise.resolve(1).then((v) => leaf(v));
}
function thenReturnsValue(): Promise<number> {
  return Promise.resolve(1).then((v) => v + 1);
}
function thenWithRejectHandler(): Promise<number> {
  return Promise.resolve(1).then(
    (v) => leaf(v),
    () => 0,
  );
}
function thenFulfilledRejects(): Promise<number> {
  return Promise.resolve(1).then(
    () => boom("from handler"),
    () => 0,
  );
}
function rejectHandlerReturnsPromise(): Promise<number> {
  return boom("x").then(
    (v) => v,
    () => leaf(20),
  );
}
function catchReturnsPromise(): Promise<number> {
  return boom("c").catch(() => leaf(5));
}
function finallyReturnsPromise(): Promise<number> {
  return leaf(1).finally(() => quiet());
}
async function awaitThenChain(): Promise<number> {
  return thenReturnsPromise();
}

async function run<T>(name: string, f: () => Promise<T>): Promise<void> {
  log.length = 0;
  const chain = ticks("t", 12);
  f().then(
    (v) => {
      log.push("R" + JSON.stringify(v));
    },
    (e) => {
      log.push("E:" + (e as Error).message);
    },
  );
  queueMicrotask(() => {
    log.push("q");
  });
  await chain;
  console.log(name.padEnd(28), log.join(" "));
}

async function main(): Promise<void> {
  await run("returnText", returnText);
  await run("returnSlowText", returnSlowText);
  await run("returnPoint", returnPoint);
  await run("returnPointInTry", returnPointInTry);
  await run("returnFlag", returnFlag);
  await run("returnList", returnList);
  await run("returnVoid", returnVoid);
  await run("returnVoidLater", returnVoidLater);
  await run("returnVoidRejection", returnVoidRejection);
  await run("methodRelay", () => service.relay(1));
  await run("methodRelayInTry", () => service.relayInTry(2));
  await run("viaClosure", () => viaClosure(8));
  await run("conciseArrow", conciseArrow);
  await run("conciseSlowArrow", conciseSlowArrow);
  await run("conciseVoidArrow", conciseVoidArrow);
  await run("conciseVoidRejection", conciseVoidRejection);
  await run("thenReturnsPromise", thenReturnsPromise);
  await run("thenReturnsValue", thenReturnsValue);
  await run("thenWithRejectHandler", thenWithRejectHandler);
  await run("thenFulfilledRejects", thenFulfilledRejects);
  await run("rejectHandlerReturnsPromise", rejectHandlerReturnsPromise);
  await run("catchReturnsPromise", catchReturnsPromise);
  await run("finallyReturnsPromise", finallyReturnsPromise);
  await run("awaitThenChain", awaitThenChain);
}

void main();
