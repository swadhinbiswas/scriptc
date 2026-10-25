// A string event name spelling a key the runtime could use for
// events.errorMonitor is an ordinary event, as in Node where the monitor
// is a symbol: it keeps its own argument tuple, and removeAllListeners,
// listenerCount, emit and listeners on it never reach the monitors (nor
// the reverse), whether the name is a literal or a runtime string.
import { EventEmitter, errorMonitor } from "node:events";

const spelled = "\u0000events.errorMonitor";
const printed = "Symbol(events.errorMonitor)";
const em = new EventEmitter();
em.on(errorMonitor, (err: Error) => console.log("monitor", err.message));
em.on(spelled, (n: number, label: string) => console.log("spelled", n, label));
em.on(printed, (n: number, label: string) => console.log("printed", n, label));
console.log(em.listenerCount(errorMonitor), em.listenerCount(spelled), em.listenerCount(printed));

console.log(em.emit(spelled, 1, "to the spelled string"));
console.log(em.emit(printed, 2, "to the printed string"));
console.log(em.emit(errorMonitor, new Error("to the monitor")));
try {
  em.emit("error", new Error("unhandled"));
} catch (err) {
  console.log("thrown", (err as Error).message);
}
console.log(em.listeners(spelled).length, em.listeners(printed).length);

em.removeAllListeners(spelled);
console.log(em.listenerCount(errorMonitor), em.listenerCount(spelled), em.listenerCount(printed));
em.on(spelled, (n: number, label: string) => console.log("spelled again", n, label));
em.removeAllListeners(errorMonitor);
console.log(em.listenerCount(errorMonitor), em.listenerCount(spelled), em.listenerCount(printed));
console.log(em.emit(spelled, 3, "after the monitor left"));

// Runtime strings with the same bytes reach the string events only.
em.on(errorMonitor, (err: Error) => console.log("monitor again", err.message));
const names: string[] = [spelled, printed, "events.errorMonitor"];
for (const name of names) console.log(JSON.stringify(name), em.listenerCount(name));
for (const name of names) em.removeAllListeners(name);
console.log(em.listenerCount(errorMonitor), em.listenerCount(spelled), em.listenerCount(printed));
try {
  em.emit("error", new Error("still monitored"));
} catch (err) {
  console.log("thrown", (err as Error).message);
}
