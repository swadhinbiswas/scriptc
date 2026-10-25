// Atomics.wait and Atomics.notify results: not-equal, timed-out and ok;
// notify counts with and without waiters, on other indexes and views of the
// same storage, on unshared arrays; waiters on many indexes released one
// index at a time.
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";

const INDEXES = 48;

if (isMainThread) {
  const buffer = new SharedArrayBuffer(4 * (INDEXES + 8));
  const cells = new Int32Array(buffer);
  console.log(Atomics.wait(cells, 0, 1), Atomics.wait(cells, 0, 0, 0), Atomics.wait(cells, 0, 0, 1));
  console.log(Atomics.notify(cells, 0), Atomics.notify(cells, 0, 0), Atomics.notify(new Int32Array(4), 0, 1));
  try {
    Atomics.wait(new Int32Array(4), 0, 0, 0);
  } catch (error) {
    console.log((error as Error).name, (error as Error).message);
  }
  try {
    Atomics.notify(cells, INDEXES + 8);
  } catch (error) {
    console.log((error as Error).name);
  }

  // One worker waits on each of many indexes; release them in order.
  const control = new Int32Array(new SharedArrayBuffer(16));
  const worker = new Worker(new URL(import.meta.url), { workerData: { buffer, control: control.buffer } });
  const order: number[] = [];
  worker.on("message", (message: unknown) => {
    if (typeof message === "number") order.push(message);
    else console.log("worker", JSON.stringify(message));
  });
  worker.on("exit", (code: number) => {
    console.log("released", order.join(","), "exit", code);
  });
  // Wait until the worker is parked on index 0, then release each index.
  while (Atomics.load(control, 0) !== 1) Atomics.wait(control, 0, 0, 5);
  const view = new Int32Array(buffer, 4 * 8);
  // The worker can only be waiting on index 0: notifying any other index,
  // through either view, wakes nothing.
  let others = 0;
  for (let index = 1; index < INDEXES; index++) others += Atomics.notify(view, index) + Atomics.notify(cells, 8 + index);
  console.log("other indexes woke", others);
  for (let index = 0; index < INDEXES; index += 1) {
    for (;;) {
      Atomics.store(view, index, 1);
      if (Atomics.notify(cells, 8 + index, 1) === 1 || Atomics.load(control, 1) > index) break;
      Atomics.wait(control, 0, 1, 1);
    }
  }
} else {
  const { buffer, control } = workerData as { buffer: SharedArrayBuffer; control: SharedArrayBuffer };
  const cells = new Int32Array(buffer);
  const flags = new Int32Array(control);
  const results: string[] = [];
  Atomics.store(flags, 0, 1);
  Atomics.notify(flags, 0);
  for (let index = 0; index < INDEXES; index++) {
    let result = Atomics.wait(cells, 8 + index, 0);
    while (result === "timed-out") result = Atomics.wait(cells, 8 + index, 0);
    results.push(result === "not-equal" ? "ok" : result);
    Atomics.store(flags, 1, index + 1);
    parentPort!.postMessage(index);
  }
  parentPort!.postMessage({ results: [...new Set(results)], last: Atomics.load(cells, 8 + INDEXES - 1) });
}
