// Worker threads updating SharedArrayBuffer counters with Atomics: one
// counter for all workers, one counter each (on separate cache lines), a
// compareExchange loop, and a wait/notify handoff between pairs of workers.
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";

const WORKERS = 4;
const STRIDE = 16; // Int32 slots between counters: 64 bytes

type Job = { buffer: SharedArrayBuffer; id: number; scale: number };

function counters(job: Job): void {
  const cells = new Int32Array(job.buffer);
  const own = STRIDE * (job.id + 4);
  const ops = 400_000 * job.scale;
  for (let i = 0; i < ops; i++) {
    Atomics.add(cells, 0, 1);
    Atomics.add(cells, own, 1);
  }
  for (let i = 0; i < ops / 4; i++) {
    for (;;) {
      const seen = Atomics.load(cells, STRIDE);
      if (Atomics.compareExchange(cells, STRIDE, seen, seen + 1) === seen) break;
    }
  }
  // Pairs (0, 1) and (2, 3) pass a token back and forth.
  const turn = STRIDE * (2 + (job.id >> 1));
  const mine = job.id & 1;
  const rounds = 2_000 * job.scale;
  for (let i = 0; i < rounds; i++) {
    while (Atomics.load(cells, turn) !== mine) Atomics.wait(cells, turn, 1 - mine);
    Atomics.add(cells, turn + 1, 1);
    Atomics.store(cells, turn, 1 - mine);
    Atomics.notify(cells, turn);
  }
}

if (isMainThread) {
  const scale = Number(process.argv[2] ?? "1");
  const buffer = new SharedArrayBuffer(4 * STRIDE * (WORKERS + 4));
  const cells = new Int32Array(buffer);
  let exited = 0;
  for (let id = 0; id < WORKERS; id++) {
    const worker = new Worker(new URL(import.meta.url), { workerData: { buffer, id, scale } });
    worker.on("exit", (code: number) => {
      if (code !== 0) console.log("worker exit", code);
      exited++;
      if (exited < WORKERS) return;
      const own: number[] = [];
      for (let t = 0; t < WORKERS; t++) own.push(Atomics.load(cells, STRIDE * (t + 4)));
      console.log("shared", Atomics.load(cells, 0), "cas", Atomics.load(cells, STRIDE));
      console.log("own", own.join(","));
      console.log("handoffs", Atomics.load(cells, STRIDE * 2 + 1), Atomics.load(cells, STRIDE * 3 + 1));
    });
  }
} else {
  counters(workerData as Job);
  parentPort!.postMessage("done");
}
