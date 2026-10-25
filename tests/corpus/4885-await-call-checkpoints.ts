// Directly awaited async calls against process.nextTick, setImmediate,
// a timer and queueMicrotask: ticks run before promise jobs at each
// checkpoint, and every await still waits for the jobs queued before it.
const log: string[] = [];
async function quick(n: number): Promise<number> {
  return n * 3;
}
async function once(n: number): Promise<number> {
  const v = await quick(n);
  process.nextTick(() => log.push("tick from once " + n));
  return v + 1;
}
async function runner(name: string): Promise<void> {
  log.push(name + " begin");
  for (let i = 0; i < 3; i++) {
    const v = await once(i);
    log.push(name + " step " + i + " = " + v);
    if (i === 1) {
      queueMicrotask(() => log.push(name + " microtask"));
      process.nextTick(() => log.push(name + " tick"));
    }
  }
  await new Promise<void>((resolve) => setImmediate(resolve));
  log.push(name + " after immediate " + (await quick(7)));
  await new Promise<void>((resolve) => setTimeout(resolve, 1));
  log.push(name + " after timer " + (await once(9)));
}
async function main(): Promise<void> {
  process.nextTick(() => log.push("first tick"));
  setImmediate(() => log.push("immediate"));
  const a = runner("a");
  const b = runner("b");
  log.push("main sync");
  await Promise.all([a, b]);
  const p = quick(1);
  const q = Promise.resolve(p);
  log.push("same promise " + (p === q));
  log.push("value " + (await q));
}
main().then(() => console.log(log.join("\n")));
