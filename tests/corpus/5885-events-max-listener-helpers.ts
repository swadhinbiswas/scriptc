// The events module's emitter helpers, also EventEmitter statics:
// listenerCount(emitter, name), getMaxListeners(emitter),
// setMaxListeners(n[, ...emitters]) and getEventListeners(emitter, name)
// answer through the emitter's own methods. setMaxListeners with no
// emitters sets the process default, which EventEmitter.defaultMaxListeners
// reads and writes. Limits go through Node's validateNumber (RangeError
// ERR_OUT_OF_RANGE). EventEmitter.once is events.once.
import EE, {
  EventEmitter,
  errorMonitor,
  getEventListeners,
  getMaxListeners,
  listenerCount,
  setMaxListeners,
} from "node:events";
import * as events from "node:events";

console.log(EE.defaultMaxListeners, EventEmitter.defaultMaxListeners);
const first = new EventEmitter();
const named = (): void => {};
first.on("x", named);
first.on("x", () => {});
first.on(errorMonitor, () => {});
console.log(
  listenerCount(first, "x"),
  EventEmitter.listenerCount(first, "x"),
  events.listenerCount(first, "y"),
  listenerCount(first, errorMonitor),
);
console.log(getMaxListeners(first), EventEmitter.getMaxListeners(first));

setMaxListeners(3, first);
console.log(first.getMaxListeners());
const second = new EventEmitter();
EventEmitter.setMaxListeners(4, first, second);
console.log(first.getMaxListeners(), second.getMaxListeners(), getMaxListeners(second));

setMaxListeners(20);
console.log(EventEmitter.defaultMaxListeners, new EventEmitter().getMaxListeners(), second.getMaxListeners());
EventEmitter.defaultMaxListeners = 7;
console.log(EE.defaultMaxListeners, new EventEmitter().getMaxListeners());
setMaxListeners();
console.log(EventEmitter.defaultMaxListeners);

const listeners = getEventListeners(first, "x");
console.log(listeners.length, listeners[0] === named, EventEmitter.getEventListeners(first, "x").length);

for (const run of [
  () => setMaxListeners(-1),
  () => setMaxListeners(-2, first),
  () => setMaxListeners(Number.NaN),
  () => {
    EventEmitter.defaultMaxListeners = -3;
  },
]) {
  try {
    run();
    console.log("no throw");
  } catch (error) {
    const e = error as Error & { code?: string };
    console.log(e.name, e.code, e.message);
  }
}
console.log(first.getMaxListeners(), EventEmitter.defaultMaxListeners);

class Bus extends EventEmitter {}
const bus = new Bus();
bus.once("ready", named);
console.log(listenerCount(bus, "ready"), getEventListeners(bus, "ready")[0] === named, getMaxListeners(bus));

async function main(): Promise<void> {
  setTimeout(() => bus.emit("go"), 1);
  console.log(await EventEmitter.once(bus, "go"));
}
main();
