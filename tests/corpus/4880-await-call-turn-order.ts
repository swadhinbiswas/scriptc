// Directly awaited async calls (bodies that never suspend, bodies that do,
// and chains of them) keep Node's microtask order against then-callbacks,
// queueMicrotask, and settled and pending promises.
const log: string[] = [];
const cache = new Map<number, number>();

async function hit(key: number): Promise<number> {
  const v = cache.get(key);
  if (v !== undefined) return v;
  cache.set(key, key * 10);
  return key * 10;
}
async function flag(n: number): Promise<boolean> {
  return n % 2 === 0;
}
async function label(n: number): Promise<string> {
  return "L" + n;
}
async function nothing(n: number): Promise<void> {
  log.push("nothing " + n);
}
async function suspends(n: number): Promise<number> {
  log.push("suspends enter " + n);
  const a = await hit(n);
  log.push("suspends mid " + n);
  const b = await hit(n + 1);
  return a + b;
}
async function chain(n: number): Promise<number> {
  log.push("chain enter " + n);
  const v = await suspends(n);
  log.push("chain got " + n + " " + v);
  return v + 1;
}
async function deep(n: number): Promise<number> {
  return (await chain(n)) * 2;
}

async function worker(name: string, n: number): Promise<number> {
  log.push(name + " start");
  const a = await hit(n);
  log.push(name + " a=" + a);
  const f = await flag(n);
  log.push(name + " flag=" + f);
  const s = await label(n);
  log.push(name + " label=" + s);
  await nothing(n);
  log.push(name + " after nothing");
  const d = await deep(n);
  log.push(name + " deep=" + d);
  return a + d;
}

async function main(): Promise<void> {
  const settled = Promise.resolve(7);
  const pending = new Promise<number>((resolve) => {
    setTimeout(() => {
      log.push("timer resolves");
      resolve(9);
    }, 0);
  });
  settled.then((v) => log.push("then settled " + v));
  queueMicrotask(() => log.push("microtask 1"));
  const w1 = worker("w1", 1);
  const w2 = worker("w2", 2);
  queueMicrotask(() => log.push("microtask 2"));
  Promise.resolve()
    .then(() => log.push("then A1"))
    .then(() => log.push("then A2"))
    .then(() => log.push("then A3"))
    .then(() => log.push("then A4"));
  log.push("main sync end");
  const x = await settled;
  log.push("main settled " + x);
  const t = await (async (): Promise<number> => await hit(5))();
  log.push("main arrow " + t);
  const both: number[] = await Promise.all([w1, w2]);
  log.push("workers " + both[0] + " " + both[1]);
  const p = await pending;
  log.push("main pending " + p);
  const r = await deep(3);
  log.push("main deep " + r);
}

main().then(() => {
  for (const line of log) console.log(line);
});
console.log("top-level sync end");
