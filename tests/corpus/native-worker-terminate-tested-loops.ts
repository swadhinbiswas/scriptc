import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";

// Loops whose every iteration calls a function that can throw observe a
// terminate request through that call's exception test; loops that can skip
// such a call keep their own poll. Each worker spins until it is terminated.

class Box {
  value = 0;
  bump(n: number): number {
    if (n < 0) throw new RangeError("negative " + n);
    this.value = (this.value + n) % 1000003;
    return this.value;
  }
}

function risky(n: number): number {
  if (n < 0) throw new RangeError("negative " + n);
  return (n * 31 + 7) % 1000003;
}

let announced = false;
function announce(i: number): void {
  if (!announced && i >= 1000) {
    announced = true;
    parentPort!.postMessage("ready");
  }
}

function spinCalls(): number {
  let acc = 0;
  for (let i = 0; ; i++) {
    acc = (acc + risky(i)) % 1000003;
    announce(i);
  }
}

function spinCondition(): number {
  let i = 0;
  while (risky(i) >= 0) {
    i++;
    announce(i);
  }
  return i;
}

// Once i passes 2000 every iteration continues before the call.
function spinContinue(): number {
  let acc = 0;
  for (let i = 0; ; i++) {
    if (i > 2000) continue;
    acc = (acc + risky(i)) % 1000003;
    announce(i);
  }
}

function spinMethods(): number {
  const box = new Box();
  let n = 0;
  do {
    try {
      box.bump(n % 5 === 0 ? -1 : n);
    } catch (e) {
      if (!(e instanceof RangeError)) throw e;
    }
    n++;
    announce(n);
  } while (box.bump(1) >= 0);
  return n;
}

function spinNested(): number {
  let acc = 0;
  for (let i = 0; ; i++) {
    for (let j = 0; j < 4; j++) acc = (acc + risky(j)) % 1000003;
    announce(i);
  }
}

function run(kind: string): number {
  if (kind === "calls") return spinCalls();
  if (kind === "condition") return spinCondition();
  if (kind === "continue") return spinContinue();
  if (kind === "methods") return spinMethods();
  return spinNested();
}

// The same loop shapes, bounded, with exceptions escaping mid-iteration.
function countdown(start: number): number {
  let acc = 0;
  for (let i = start; ; i--) acc = (acc + risky(i)) % 1000003;
}

function countdownWhile(start: number): number {
  let i = start;
  while (risky(i) >= 0) i--;
  return i;
}

function methodsUntil(limit: number): number {
  const box = new Box();
  let n = 0;
  do {
    n++;
  } while (box.bump(limit - n) >= 0);
  return n;
}

if (isMainThread) {
  for (const probe of [() => countdown(5), () => countdownWhile(7), () => methodsUntil(4)]) {
    try {
      console.log("unexpected", probe());
    } catch (e) {
      console.log("caught", (e as Error).name, (e as Error).message);
    } finally {
      console.log("finally");
    }
  }
  for (const kind of ["calls", "condition", "continue", "methods", "nested"]) {
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
} else {
  try {
    console.log("unexpected result", run(String(workerData)));
  } catch {
    console.log("unexpected catch");
  } finally {
    console.log("unexpected finally");
  }
}
