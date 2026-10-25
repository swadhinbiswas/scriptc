// `return p` of a promise in an async function resolves the function's
// promise with p: a then job adopts p's settlement, so the caller sees the
// result two microtask turns later than for a plain value, and one turn
// later than for `return await p`. Each form runs against a then-chain and
// queueMicrotask callbacks so the printed order shows its exact turn count.
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
async function pendingLeaf(x: number): Promise<number> {
  await null;
  return x + 1;
}
async function slowLeaf(x: number): Promise<number> {
  await null;
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

async function returnCall(): Promise<number> {
  return leaf(1);
}
async function returnAwaitCall(): Promise<number> {
  return await leaf(1);
}
async function returnValue(): Promise<number> {
  return 7;
}
async function returnSettledLocal(): Promise<number> {
  const p = Promise.resolve(3);
  return p;
}
async function returnAwaitSettledLocal(): Promise<number> {
  const p = Promise.resolve(3);
  return await p;
}
async function returnPending(): Promise<number> {
  return pendingLeaf(1);
}
async function returnAwaitPending(): Promise<number> {
  return await pendingLeaf(1);
}
async function returnSlow(): Promise<number> {
  return slowLeaf(1);
}
async function returnAwaitSlow(): Promise<number> {
  return await slowLeaf(1);
}
async function returnRejected(): Promise<number> {
  return boom("rejected");
}
async function returnAwaitRejected(): Promise<number> {
  return await boom("awaited");
}
async function returnRejectedLater(): Promise<number> {
  return boomLater("later");
}
async function returnConstructed(): Promise<number> {
  return new Promise<number>((resolve) => {
    resolve(11);
  });
}
async function returnConstructedRejection(): Promise<number> {
  return new Promise<number>((_, reject) => {
    reject(new Error("constructed"));
  });
}
async function returnAfterAwait(): Promise<number> {
  const v = await leaf(1);
  return leaf(v);
}
async function relay(): Promise<number> {
  return returnCall();
}
async function relayTwice(): Promise<number> {
  return relay();
}
async function awaitRelay(): Promise<number> {
  const v = await returnCall();
  return v * 10;
}
async function awaitRelayTwice(): Promise<number> {
  return (await relayTwice()) + (await relay());
}
async function returnShared(): Promise<number> {
  const p = leaf(6);
  p.then(() => {
    log.push("shared-then");
  });
  return p;
}
async function returnAfterQueue(): Promise<number> {
  queueMicrotask(() => {
    log.push("inner-q");
  });
  return leaf(0);
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
  console.log(name.padEnd(28), log.join(" "));
}

// Several async functions interleaved with each other.
async function worker(name: string, rounds: number): Promise<void> {
  for (let i = 0; i < rounds; i++) {
    log.push(name + i);
    await null;
  }
}
async function adopter(): Promise<void> {
  log.push("a0");
  const v = await returnCall();
  log.push("a1=" + v);
  const w = await relay();
  log.push("a2=" + w);
  const x = await returnAwaitCall();
  log.push("a3=" + x);
  const y = await returnPending();
  log.push("a4=" + y);
}

async function main(): Promise<void> {
  await run("returnCall", returnCall);
  await run("returnAwaitCall", returnAwaitCall);
  await run("returnValue", returnValue);
  await run("returnSettledLocal", returnSettledLocal);
  await run("returnAwaitSettledLocal", returnAwaitSettledLocal);
  await run("returnPending", returnPending);
  await run("returnAwaitPending", returnAwaitPending);
  await run("returnSlow", returnSlow);
  await run("returnAwaitSlow", returnAwaitSlow);
  await run("returnRejected", returnRejected);
  await run("returnAwaitRejected", returnAwaitRejected);
  await run("returnRejectedLater", returnRejectedLater);
  await run("returnConstructed", returnConstructed);
  await run("returnConstructedRejection", returnConstructedRejection);
  await run("returnAfterAwait", returnAfterAwait);
  await run("relay", relay);
  await run("relayTwice", relayTwice);
  await run("awaitRelay", awaitRelay);
  await run("awaitRelayTwice", awaitRelayTwice);
  await run("returnShared", returnShared);
  await run("returnAfterQueue", returnAfterQueue);

  log.length = 0;
  queueMicrotask(() => {
    log.push("q0");
  });
  await Promise.all([adopter(), worker("w", 10), ticks("t", 6)]);
  console.log("interleaved".padEnd(28), log.join(" "));
}

void main();
