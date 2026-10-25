// Exceptions thrown by directly awaited async calls, before and after the
// callee's first await, reach the awaiter's catch on Node's turn, and
// finally blocks and rethrows keep their order against other microtasks.
const log: string[] = [];

async function failsNow(n: number): Promise<number> {
  if (n > 0) throw new Error("now " + n);
  return n;
}
async function failsString(n: number): Promise<string> {
  if (n > 0) throw "plain " + n;
  return "ok";
}
async function failsLater(n: number): Promise<number> {
  log.push("later enter " + n);
  await failsNow(0);
  log.push("later resumed " + n);
  throw new Error("later " + n);
}
async function failsVoid(): Promise<void> {
  throw new RangeError("void failure");
}
async function rethrows(n: number): Promise<number> {
  try {
    return await failsLater(n);
  } catch (e) {
    log.push("rethrows caught " + (e as Error).message);
    throw new Error("wrapped " + (e as Error).message);
  } finally {
    log.push("rethrows finally " + n);
  }
}

async function probe(name: string): Promise<void> {
  try {
    await failsNow(1);
  } catch (e) {
    log.push(name + " caught " + (e as Error).message);
  }
  try {
    await failsString(2);
  } catch (e) {
    log.push(name + " caught " + String(e));
  }
  try {
    await failsVoid();
  } catch (e) {
    log.push(name + " caught " + (e as Error).name + " " + (e as Error).message);
  }
  try {
    await rethrows(3);
  } catch (e) {
    log.push(name + " caught " + (e as Error).message);
  }
  const ok = await failsNow(0);
  log.push(name + " ok " + ok);
}

async function main(): Promise<void> {
  queueMicrotask(() => log.push("microtask before"));
  const a = probe("a");
  const b = probe("b");
  Promise.resolve()
    .then(() => log.push("tick 1"))
    .then(() => log.push("tick 2"))
    .then(() => log.push("tick 3"));
  await a;
  await b;
  let caught = "";
  try {
    await (async (): Promise<number> => {
      throw new Error("inline arrow");
    })();
  } catch (e) {
    caught = (e as Error).message;
  }
  log.push("arrow " + caught);
}

main().then(() => {
  for (const line of log) console.log(line);
});
