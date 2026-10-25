// A single-producer, single-consumer ring buffer: the producer writes each
// slot with ordinary stores to Uint8, Int16 and Float64 views and publishes
// it with Atomics.store; the consumer sees the slot after Atomics.load and
// sleeps in Atomics.wait while the ring is empty or full.
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";

const SLOTS = 8;
const ITEMS = 3000;

type Ring = { buffer: SharedArrayBuffer };

function views(buffer: SharedArrayBuffer) {
  return {
    head: new Int32Array(buffer, 0, 2), // [written, read]
    tags: new Uint8Array(buffer, 8, SLOTS),
    small: new Int16Array(buffer, 16, SLOTS),
    values: new Float64Array(buffer, 32, SLOTS),
  };
}

if (isMainThread) {
  const buffer = new SharedArrayBuffer(32 + 8 * SLOTS);
  const ring = views(buffer);
  const worker = new Worker(new URL(import.meta.url), { workerData: { buffer } });
  worker.on("message", (message: unknown) => console.log("consumer", JSON.stringify(message)));
  worker.on("exit", (code: number) => console.log("exit", code, Atomics.load(ring.head, 0), Atomics.load(ring.head, 1)));
  for (let item = 0; item < ITEMS; item++) {
    for (;;) {
      const read = Atomics.load(ring.head, 1);
      if (item - read < SLOTS) break;
      Atomics.wait(ring.head, 1, read, 50);
    }
    const slot = item % SLOTS;
    ring.tags[slot] = item & 0xff;
    ring.small[slot] = -item;
    ring.values[slot] = item / 4;
    Atomics.store(ring.head, 0, item + 1);
    Atomics.notify(ring.head, 0);
  }
} else {
  const { buffer } = workerData as Ring;
  const ring = views(buffer);
  let tagSum = 0;
  let smallSum = 0;
  let valueSum = 0;
  let mismatches = 0;
  for (let item = 0; item < ITEMS; item++) {
    for (;;) {
      const written = Atomics.load(ring.head, 0);
      if (written > item) break;
      Atomics.wait(ring.head, 0, written, 50);
    }
    const slot = item % SLOTS;
    const tag = ring.tags[slot]!;
    const small = ring.small[slot]!;
    const value = ring.values[slot]!;
    if (tag !== (item & 0xff) || small !== ((-item << 16) >> 16) || value !== item / 4) mismatches++;
    tagSum += tag;
    smallSum += small;
    valueSum += value;
    Atomics.store(ring.head, 1, item + 1);
    Atomics.notify(ring.head, 1);
  }
  parentPort!.postMessage({ tagSum, smallSum, valueSum, mismatches });
}
