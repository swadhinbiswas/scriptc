import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";
import type { ProgramLifetime } from "@scriptc/types";
import { LifetimeRegion } from "@scriptc/experimental";

// LifetimeRegion (@scriptc/experimental) on several threads at once: each
// worker builds and releases its own generations of ProgramLifetime
// objects, and the main thread does the same meanwhile. Regions belong to
// the thread that created them. Node.js prints the same.

class Term implements ProgramLifetime {
  readonly op: string;
  readonly args: Term[];
  readonly value: number;
  constructor(op: string, args: Term[], value: number) {
    this.op = op;
    this.args = args;
    this.value = value;
  }
}

function grow(seed: number, depth: number): Term {
  if (depth === 0) return new Term("n", [], seed % 10);
  return new Term(seed % 2 === 0 ? "+" : "*", [grow(seed * 3 + 1, depth - 1), grow(seed * 5 + 2, depth - 1)], 0);
}

function evaluate(t: Term): number {
  if (t.op === "n") return t.value;
  const [a, b] = t.args;
  return t.op === "+" ? (evaluate(a!) + evaluate(b!)) % 1000003 : (evaluate(a!) * evaluate(b!)) % 1000003;
}

function generations(seed: number, count: number): number[] {
  const results: number[] = [];
  let previous: LifetimeRegion | undefined;
  for (let g = 0; g < count; g++) {
    const region = new LifetimeRegion();
    const term = region.run(() => grow(seed + g, 9));
    results.push(evaluate(term));
    previous?.release();
    previous = region;
  }
  previous?.release();
  return results;
}

if (isMainThread) {
  const replies: string[] = [];
  let pending = 3;
  for (let w = 0; w < 3; w++) {
    const worker = new Worker(new URL(import.meta.url), { workerData: { seed: w * 7 + 3 } });
    worker.on("message", (message: unknown) => {
      replies[w] = `worker ${w}: ${(message as number[]).join(",")}`;
    });
    worker.on("exit", () => {
      if (--pending === 0) for (const line of replies) console.log(line);
    });
  }
  console.log(`main: ${generations(7, 6).join(",")}`);
} else {
  const { seed } = workerData as { seed: number };
  parentPort!.postMessage(generations(seed, 8));
}
