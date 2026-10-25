// Workers race on shared counters with every Atomics read-modify-write:
// one counter for all workers, one counter each, bit sets and toggles,
// compare-exchange loops and narrow counters that wrap. Each final value
// has one correct answer.
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";

const WORKERS = 4;
const ROUNDS = 20000;

type Job = { buffer: SharedArrayBuffer; id: number };

if (isMainThread) {
  const buffer = new SharedArrayBuffer(256);
  const words = new Int32Array(buffer);
  Atomics.store(words, 12, -1);
  let exited = 0;
  for (let id = 0; id < WORKERS; id++) {
    const worker = new Worker(new URL(import.meta.url), { workerData: { buffer, id } });
    worker.on("exit", (code: number) => {
      if (code !== 0) console.log("worker exit", code);
      exited++;
      if (exited < WORKERS) return;
      const bytes = new Uint8Array(buffer);
      const halves = new Int16Array(buffer);
      console.log("shared add", words[0], "sub", words[1], "cas", words[2]);
      console.log("own", [words[4], words[5], words[6], words[7]].join(","));
      console.log("bits", Atomics.load(words, 8).toString(2), "xor", Atomics.load(words, 9));
      console.log("u8 wrap", Atomics.load(bytes, 40), "i16 wrap", Atomics.load(halves, 21));
      console.log("max", Atomics.load(words, 11), "and", (Atomics.load(words, 12) >>> 0).toString(16));
    });
  }
} else {
  const { buffer, id } = workerData as Job;
  const words = new Int32Array(buffer);
  const bytes = new Uint8Array(buffer);
  const halves = new Int16Array(buffer);
  for (let i = 0; i < ROUNDS; i++) {
    Atomics.add(words, 0, 1);
    Atomics.sub(words, 1, 2);
    for (;;) {
      const seen = Atomics.load(words, 2);
      if (Atomics.compareExchange(words, 2, seen, seen + 3) === seen) break;
    }
    Atomics.add(words, 4 + id, id + 1);
    Atomics.xor(words, 9, 1 << id);
    Atomics.add(bytes, 40, 1);
    Atomics.sub(halves, 21, 7);
    // A compare-exchange maximum.
    const candidate = id * ROUNDS + i;
    for (;;) {
      const current = Atomics.load(words, 11);
      if (current >= candidate || Atomics.compareExchange(words, 11, current, candidate) === current) break;
    }
  }
  Atomics.or(words, 8, 1 << (id * 3));
  Atomics.and(words, 12, ~(0xf << (id * 4)));
  parentPort!.postMessage("done");
}
