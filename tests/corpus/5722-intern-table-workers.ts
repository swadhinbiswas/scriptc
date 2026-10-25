import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";
import { InternTable } from "@scriptc/experimental";

// InternTable (@scriptc/experimental) from several threads at once: the
// main thread and four workers intern overlapping keys while the others
// insert and look them up. In scriptc every thread shares the tables and
// may receive values another thread created; under Node.js each thread has
// its own tables. Values depend only on their keys, so every thread prints
// the same summary in both.

class Entry {
  readonly name: string;
  readonly weight: number;
  readonly parts: readonly string[];
  constructor(name: string, weight: number, parts: readonly string[]) {
    this.name = name;
    this.weight = weight;
    this.parts = parts;
  }
}

const entries = new InternTable<string, Entry>("workers.entries");
const squares = new InternTable<number, number>("workers.squares");
const labels = new InternTable<number, string>("workers.labels");
const KEYS = 20000;

function weightOf(key: string): number {
  let h = 7;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 1000003;
  return h;
}

function work(seed: number): string {
  let sum = 0;
  let bad = 0;
  for (let n = 0; n < KEYS; n++) {
    const k = (n * 7 + seed * 2003) % KEYS;
    const key = `key-${k}`;
    const e = entries.getOrInsertComputed(key, (name) => new Entry(name, weightOf(name), [name, `${k}`]));
    if (e.name !== key || e.parts[1] !== `${k}` || e.weight !== weightOf(key)) bad++;
    sum = (sum + e.weight) % 1000000007;
    if (squares.getOrInsert(k, k * k) !== k * k) bad++;
    const label = labels.getOrInsertComputed(k % 997, (m) => `label-${m}`);
    if (label !== `label-${k % 997}`) bad++;
  }
  // Everything this thread stored or received is visible to it.
  let missing = 0;
  for (let k = 0; k < KEYS; k++) {
    if (!entries.has(`key-${k}`) || squares.get(k) !== k * k) missing++;
  }
  return `sum=${sum} bad=${bad} missing=${missing} entries>=${entries.size >= KEYS} labels>=${labels.size >= 997}`;
}

if (isMainThread) {
  const results: string[] = [];
  let pending = 4;
  let mine = "";
  for (let w = 0; w < 4; w++) {
    const worker = new Worker(new URL(import.meta.url), { workerData: { seed: w + 1 } });
    worker.on("message", (message: unknown) => {
      results[w] = message as string;
    });
    worker.on("exit", (code: number) => {
      if (code !== 0) console.log(`worker ${w} exited with ${code}`);
      if (--pending === 0) {
        console.log(`main: ${mine}`);
        for (let i = 0; i < 4; i++) console.log(`worker ${i}: ${results[i]}`);
      }
    });
  }
  // The main thread interns while the workers run.
  mine = work(0);
} else {
  const { seed } = workerData as { seed: number };
  parentPort!.postMessage(work(seed));
}
