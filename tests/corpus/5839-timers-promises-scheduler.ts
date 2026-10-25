// timers/promises scheduler.wait(delay[, options]) and scheduler.yield():
// Node defines them as setTimeout(delay, undefined, options) and
// setImmediate(), so both resolve undefined, an omitted delay waits the
// 1 ms floor, and they order against timers, immediates and microtasks
// like those calls. The namespace and named-import spellings compile the
// same. `ref: false` lets the process exit before the wait settles.
import { scheduler, setTimeout as sleep } from "node:timers/promises";
import * as timersPromises from "node:timers/promises";

const events: string[] = [];

async function main(): Promise<void> {
  const waited = scheduler.wait(1).then((value) => typeof value);
  const yielded = scheduler.yield().then((value) => typeof value);
  console.log(await waited, await yielded);
  await scheduler.wait();
  await timersPromises.scheduler.wait(2, { ref: true });
  await timersPromises.scheduler.yield();
  console.log("namespace forms resolved");

  const done = Promise.all([
    scheduler.wait(40).then(() => events.push("wait 40")),
    sleep(5).then(() => events.push("sleep 5")),
    scheduler.yield().then(() => events.push("yield")),
    Promise.resolve().then(() => events.push("microtask")),
  ]);
  setImmediate(() => events.push("setImmediate"));
  await done;
  console.log(events.join(", "));

  const start = Date.now();
  await scheduler.wait(30);
  console.log("waited at least 25 ms:", Date.now() - start >= 25);

  scheduler.wait(60_000, { ref: false }).then(() => console.log("never printed"));
  console.log("main done");
}

main();
