// events.errorMonitor: listeners registered under the symbol see every
// 'error' emit first, with the same payload; they do not count as 'error'
// listeners, so an emit with none still throws after the monitors ran.
// Emitting the symbol itself reaches only the monitors.
import { EventEmitter, errorMonitor } from "node:events";

class Job extends EventEmitter {
  readonly name: string;
  constructor(name: string) {
    super();
    this.name = name;
  }
}

const job = new Job("build");
job.on(errorMonitor, (err: Error) => console.log("monitor A", err.message));
job.once(EventEmitter.errorMonitor, (err: Error) => console.log("monitor once", err.message));
job.on("error", (err: Error) => console.log("error listener", err.message));
job.on(errorMonitor, (err: Error) => console.log("monitor B", err.message));
console.log(job.emit("error", new Error("first")));
console.log(job.emit("error", new TypeError("second")));
console.log(job.listenerCount(errorMonitor), job.listenerCount("error"));

const bare = new Job("bare");
bare.on(errorMonitor, (err: Error) => console.log("bare monitor", err.message));
try {
  bare.emit("error", new RangeError("unhandled"));
} catch (err) {
  console.log("thrown", (err as Error).name, (err as Error).message);
}
console.log(bare.emit(errorMonitor, new Error("direct")));
bare.removeAllListeners(errorMonitor);
console.log(bare.listenerCount(errorMonitor));
try {
  bare.emit("error", new Error("no monitors left"));
} catch (err) {
  console.log("thrown", (err as Error).message);
}
