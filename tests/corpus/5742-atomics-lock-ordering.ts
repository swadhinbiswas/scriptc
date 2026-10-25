// A lock built from Atomics.compareExchange, Atomics.wait and Atomics.notify
// guards ordinary reads and writes of shared Int32 and Float64 elements.
// The sequentially consistent operations order the plain accesses, so
// every increment under the lock survives.
import { Worker, isMainThread, workerData } from "node:worker_threads";

const WORKERS = 4;
const ROUNDS = 5000;

// 0 unlocked, 1 locked, 2 locked with waiters.
function lock(state: Int32Array): void {
  let c = Atomics.compareExchange(state, 0, 0, 1);
  if (c === 0) return;
  if (c !== 2) c = Atomics.exchange(state, 0, 2);
  while (c !== 0) {
    Atomics.wait(state, 0, 2);
    c = Atomics.exchange(state, 0, 2);
  }
}

function unlock(state: Int32Array): void {
  if (Atomics.sub(state, 0, 1) !== 1) {
    Atomics.store(state, 0, 0);
    Atomics.notify(state, 0, 1);
  }
}

type Job = { control: SharedArrayBuffer; data: SharedArrayBuffer; id: number };

if (isMainThread) {
  const control = new SharedArrayBuffer(16);
  const data = new SharedArrayBuffer(64);
  let exited = 0;
  for (let id = 0; id < WORKERS; id++) {
    const worker = new Worker(new URL(import.meta.url), { workerData: { control, data, id } });
    worker.on("exit", () => {
      exited++;
      if (exited < WORKERS) return;
      const ints = new Int32Array(data);
      const floats = new Float64Array(data, 32, 4);
      console.log("count", ints[0], "pairs", ints[1] === ints[2], ints[1], ints[2]);
      console.log("sum", floats[0], "last writer seen", ints[3] >= 0 && ints[3] < WORKERS);
      console.log("lock", Atomics.load(new Int32Array(control), 0));
    });
  }
} else {
  const { control, data, id } = workerData as Job;
  const state = new Int32Array(control);
  const ints = new Int32Array(data);
  const floats = new Float64Array(data, 32, 4);
  for (let i = 0; i < ROUNDS; i++) {
    lock(state);
    // Plain read-modify-write sequences: correct only under the lock.
    ints[0] = ints[0]! + 1;
    const pair = ints[1]!;
    ints[1] = pair + 1;
    ints[2] = ints[2]! + 1;
    floats[0] = floats[0]! + 0.5;
    ints[3] = id;
    unlock(state);
  }
}
