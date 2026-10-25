import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";

// Function-typed fields called as methods inside worker threads: each
// thread binds its own instances as `this` while the main thread does the
// same, and the results come back over the message port.
class Tally {
  total = 0;
  name: string;
  add: (this: Tally, n: number) => number;
  constructor(name: string) {
    this.name = name;
    this.add = function (this: Tally, n: number): number {
      this.total += n;
      return this.total;
    };
  }
}

function work(seed: number): string {
  const tallies = [new Tally(`a${seed}`), new Tally(`b${seed}`)];
  for (let i = 0; i < 2000; i++) tallies[i % 2]!.add(i + seed);
  return tallies.map((t) => `${t.name}:${t.total}`).join(" ");
}

if (isMainThread) {
  const results = await Promise.all(
    [1, 2, 3].map(
      (k) =>
        new Promise<string>((resolve, reject) => {
          let result = "";
          const worker = new Worker(new URL(import.meta.url), { workerData: k });
          worker.once("message", (value: unknown) => {
            result = value as string;
          });
          worker.once("error", reject);
          worker.once("exit", () => resolve(result));
        }),
    ),
  );
  console.log(work(0));
  for (const line of results) console.log(line);
} else {
  parentPort!.postMessage(work(workerData as number));
}
