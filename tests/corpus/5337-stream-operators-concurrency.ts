import { Readable } from "node:stream";

// map output interleaved with microtasks, ticks and immediates
await new Promise<void>((done) => {
  const log: string[] = [];
  const src = Readable.from(["a", "b", "c"]);
  const out = src.map((c: string) => {
    log.push(`map ${c}`);
    return c.toUpperCase();
  });
  out.on("data", (c: string) => log.push(`data ${c}`));
  out.on("end", () => {
    log.push("end");
    console.log(log.join("\n"));
    done();
  });
  Promise.resolve()
    .then(() => log.push("micro1"))
    .then(() => log.push("micro2"))
    .then(() => log.push("micro3"));
  process.nextTick(() => log.push("tick"));
  setImmediate(() => log.push("immediate"));
});

// concurrency 2 keeps output order; take() destroys its source. "a" is
// released only after "c" ends and the others resume on setImmediate, so
// the order does not depend on timer precision.
const log: string[] = [];
const gate = Promise.withResolvers<void>();
const out = Readable.from(["a", "b", "c", "d"]).map(async (c: string) => {
  log.push(`start ${c}`);
  if (c === "a") await gate.promise;
  else await new Promise<void>((r) => setImmediate(r));
  log.push(`end ${c}`);
  if (c === "c") gate.resolve();
  return c + c;
}, { concurrency: 2 });
for await (const v of out) log.push(`got ${String(v)}`);
console.log(log.join("\n"));
const taken = Readable.from(["1", "2", "3", "4"]);
const firstTwo = await taken.map((c: string) => { log.length = 0; return c; }).take(2).toArray();
console.log(firstTwo, taken.destroyed);
const dropped = await Readable.from(["1", "2", "3"]).drop(1.5).toArray();
console.log(dropped);
