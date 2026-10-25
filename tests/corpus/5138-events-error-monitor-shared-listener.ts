// One listener registered under events.errorMonitor and under a string
// spelling the same name: once, prepend, off and the listenerCount filter
// act on the key they are given and leave the other registration alone.
import { EventEmitter, errorMonitor } from "node:events";

class Worker extends EventEmitter {
  failures = 0;
}

const spelled = "\u0000events.errorMonitor";
const worker = new Worker();
const seen = (err: Error): void => {
  worker.failures++;
  console.log("seen", err.message, worker.failures);
};
worker.on(errorMonitor, seen);
worker.on(spelled, seen);
worker.prependListener(errorMonitor, (err: Error) => console.log("first monitor", err.message));
worker.once(spelled, (err: Error) => console.log("once spelled", err.message));
console.log(worker.listenerCount(errorMonitor), worker.listenerCount(spelled));
console.log(worker.listenerCount(errorMonitor, seen), worker.listenerCount(spelled, seen));

worker.emit(spelled, new Error("string event"));
worker.emit(spelled, new Error("string event again"));
worker.on("error", (err: Error) => console.log("handled", err.message));
worker.emit("error", new Error("error event"));

worker.off(spelled, seen);
console.log(worker.listenerCount(errorMonitor, seen), worker.listenerCount(spelled, seen));
worker.emit("error", new Error("monitor kept"));
worker.on(spelled, seen);
worker.off(errorMonitor, seen);
console.log(worker.listenerCount(errorMonitor, seen), worker.listenerCount(spelled, seen));
worker.emit("error", new Error("monitor removed"));
worker.emit(spelled, new Error("string kept"));
console.log("failures", worker.failures);
