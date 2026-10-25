// Counting semaphores on many indexes of one Int32Array, shared by eight
// workers that acquire with Atomics.wait and release with Atomics.notify,
// while other workers hammer neighboring indexes with Atomics.add.
import { Worker, isMainThread, workerData } from "node:worker_threads";

const WAITERS = 6;
const ADDERS = 2;
const SEMAPHORES = 16;
const ROUNDS = 400;

function acquire(cells: Int32Array, index: number): void {
  for (;;) {
    const available = Atomics.load(cells, index);
    if (available > 0) {
      if (Atomics.compareExchange(cells, index, available, available - 1) === available) return;
    } else Atomics.wait(cells, index, available, 20);
  }
}

function release(cells: Int32Array, index: number): void {
  Atomics.add(cells, index, 1);
  Atomics.notify(cells, index, 1);
}

type Job = { buffer: SharedArrayBuffer; id: number; kind: string };

if (isMainThread) {
  const buffer = new SharedArrayBuffer(4 * (SEMAPHORES * 4 + 4));
  const cells = new Int32Array(buffer);
  // Each semaphore starts with two permits; its usage counter sits next to it.
  for (let s = 0; s < SEMAPHORES; s++) Atomics.store(cells, s * 4, 2);
  let exited = 0;
  const total = WAITERS + ADDERS;
  for (let id = 0; id < total; id++) {
    const kind = id < WAITERS ? "waiter" : "adder";
    const worker = new Worker(new URL(import.meta.url), { workerData: { buffer, id, kind } });
    worker.on("exit", () => {
      exited++;
      if (exited < total) return;
      const permits: number[] = [];
      let uses = 0;
      let peak = 0;
      let noise = 0;
      for (let s = 0; s < SEMAPHORES; s++) {
        permits.push(Atomics.load(cells, s * 4));
        uses += Atomics.load(cells, s * 4 + 1);
        peak = Math.max(peak, Atomics.load(cells, s * 4 + 2));
        noise += Atomics.load(cells, s * 4 + 3);
      }
      console.log("permits", permits.join(","), "uses", uses, "within limit", peak <= 2, "noise", noise);
    });
  }
} else {
  const { buffer, id, kind } = workerData as Job;
  const cells = new Int32Array(buffer);
  for (let round = 0; round < ROUNDS; round++) {
    const s = (round * 7 + id * 3) % SEMAPHORES;
    if (kind === "adder") {
      for (let k = 0; k < 20; k++) Atomics.add(cells, s * 4 + 3, 1);
      continue;
    }
    acquire(cells, s * 4);
    const inside = Atomics.add(cells, s * 4 + 2, 1) + 1;
    if (inside > 2) Atomics.store(cells, s * 4 + 2, 99);
    Atomics.add(cells, s * 4 + 1, 1);
    Atomics.sub(cells, s * 4 + 2, 1);
    release(cells, s * 4);
  }
}
