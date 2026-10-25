import { Worker, isMainThread, workerData } from "node:worker_threads";
import { publish } from "@scriptc/threads";

// A constructor that stores `this` into one of its own fields and then hands
// that field to other code has let `this` escape: the object may already be
// published, so every later store must still hit the frozen-object guard.
// Node.js deep-freezes the published object and throws on those stores, and
// a worker receiving the object sees only the values written before.

let shared: Job | undefined;

class Job {
  label: string;
  value = 1;
  self: Job;
  constructor(label: string) {
    this.label = label;
    this.self = this;
    shared = publish(this.self);
    this.value = 2;
  }
}

// The self alias escapes into a registry that is published later.
const registry: Task[] = [];
function publishRegistry(): number {
  publish(registry);
  return 3;
}

class Task {
  me: Task;
  count = 0;
  constructor() {
    this.me = this;
    registry.push(this.me);
    this.count = publishRegistry();
  }
}

function attempt(label: string, f: () => void): void {
  try {
    f();
    console.log(`${label}: ok`);
  } catch (e) {
    console.log(`${label}: ${e instanceof TypeError ? "TypeError" : "other"}: ${(e as Error).message}`);
  }
}

if (isMainThread) {
  attempt("publishes self alias", () => {
    new Job("job");
  });
  const job = shared!;
  console.log("main sees", job.label, job.value, job.self === job);
  attempt("registers self alias", () => {
    new Task();
  });
  console.log("registry", registry.length, registry[0]!.count, registry[0]!.me === registry[0]);
  const worker = new Worker(new URL(import.meta.url), { workerData: { job } });
  worker.on("exit", (code: number) => {
    console.log("exit", code);
  });
} else {
  const data = workerData as { job: Job };
  const job = publish(data.job);
  console.log("worker sees", job.label, job.value, job.self === job);
}
