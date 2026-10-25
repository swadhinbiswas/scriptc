import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";

// worker.terminate() arriving while the worker's exception state is busy:
// inside catch and finally bodies, with an exception stashed across a finally
// or propagating through frames, inside generator and async bodies, inside
// callbacks the runtime calls, and before the worker has started. Termination
// is not catchable and skips every catch and finally handler, so the worker
// prints nothing once it has announced itself.

class Fault extends Error {
  readonly code: number;
  constructor(code: number) {
    super(`fault ${code}`);
    this.name = "Fault";
    this.code = code;
  }
}

function fail(code: number): never {
  throw new Fault(code);
}

function risky(n: number): number {
  if (n < 0) fail(-n);
  return (n * 31 + 7) % 1000003;
}

let announced = false;
function announce(): void {
  if (!announced) {
    announced = true;
    parentPort!.postMessage("ready");
  }
}

function spin(): number {
  let acc = 0;
  for (let i = 0; ; i++) {
    acc = (acc + risky(i % 1000)) % 1000003;
    if (i === 1000) announce();
  }
}

function inCatch(): number {
  try {
    return risky(-1);
  } catch (error) {
    if ((error as Fault).code !== 1) console.log("unexpected code");
    return spin();
  }
}

function inFinally(): number {
  try {
    return risky(-2);
  } finally {
    spin();
  }
}

function inNestedFinally(): number {
  try {
    try {
      return spin();
    } finally {
      console.log("unexpected inner finally");
    }
  } catch {
    console.log("unexpected outer catch");
    return 0;
  }
}

function deep(n: number): number {
  if (n === 0) return risky(-3);
  try {
    return deep(n - 1);
  } finally {
    if (n === 1) risky(n);
  }
}

function propagating(): number {
  let caught = 0;
  for (let i = 0; ; i++) {
    try {
      deep(40);
    } catch {
      caught++;
      if (caught === 1000) announce();
    }
  }
}

function* producer(): Generator<number> {
  yield 1;
  try {
    yield spin();
  } finally {
    console.log("unexpected generator finally");
  }
}

function inGenerator(): number {
  let total = 0;
  try {
    for (const value of producer()) total += value;
  } catch {
    console.log("unexpected generator catch");
  }
  return total;
}

async function asyncBody(): Promise<number> {
  await null;
  try {
    return spin();
  } catch {
    console.log("unexpected async catch");
    return 0;
  } finally {
    console.log("unexpected async finally");
  }
}

function inCallback(): number {
  try {
    return [1, 2, 3].map((n) => (n === 2 ? spin() : n)).length;
  } catch {
    console.log("unexpected callback catch");
    return 0;
  } finally {
    console.log("unexpected callback finally");
  }
}

function inComparator(): number {
  try {
    return [3, 1, 2].sort((a, b) => (a === 1 || b === 1 ? spin() : a - b)).length;
  } finally {
    console.log("unexpected comparator finally");
  }
}

function run(kind: string): number {
  switch (kind) {
    case "catch":
      return inCatch();
    case "finally":
      return inFinally();
    case "nested":
      return inNestedFinally();
    case "propagating":
      return propagating();
    case "generator":
      return inGenerator();
    case "callback":
      return inCallback();
    case "comparator":
      return inComparator();
    default:
      return spin();
  }
}

if (isMainThread) {
  const kinds = ["catch", "finally", "nested", "propagating", "generator", "async", "callback", "comparator"];
  for (const kind of kinds) {
    await new Promise<void>((resolve) => {
      const worker = new Worker(new URL(import.meta.url), { workerData: kind });
      worker.once("message", () => {
        void worker.terminate().then((code: number) => console.log(kind, "terminate", code));
      });
      worker.once("exit", (code: number) => {
        console.log(kind, "exit", code);
        resolve();
      });
    });
  }
  // Terminated before the worker can have started its script (Node reports
  // exit code 0 here, scriptc 1: only the stop itself is pinned).
  for (let i = 0; i < 3; i++) {
    await new Promise<void>((resolve) => {
      const worker = new Worker(new URL(import.meta.url), { workerData: "early" });
      void worker.terminate();
      worker.once("exit", () => {
        console.log("early exit", i);
        resolve();
      });
    });
  }
  // The main thread's own exceptions are unaffected by the stopped workers.
  try {
    risky(-4);
  } catch (error) {
    console.log("main caught", (error as Fault).code, risky(5));
  }
} else if (workerData === "async") {
  asyncBody().then(
    () => console.log("unexpected async result"),
    () => console.log("unexpected async rejection"),
  );
} else {
  try {
    console.log("unexpected result", run(String(workerData)));
  } catch {
    console.log("unexpected catch");
  } finally {
    console.log("unexpected finally");
  }
}
