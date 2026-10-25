// The typed-array scan loops in a worker-enabled executable: the program can
// start a worker (it never does), so typed-array accesses check for shared
// storage. See typed-array-scan-kernels.ts.
import { Worker, isMainThread } from "node:worker_threads";
import { run } from "./typed-array-scan-kernels.ts";

if (isMainThread) {
  if (process.argv[3] === "spawn") new Worker(new URL(import.meta.url));
  run(Number(process.argv[2] ?? "1"));
}
