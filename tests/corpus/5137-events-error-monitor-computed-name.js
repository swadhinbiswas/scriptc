// Computed and runtime-built event names never reach events.errorMonitor,
// whatever their bytes: Node keys the monitor by a symbol. The JS lane's
// computed-name registrations, emits, counts and removals stay on the
// string events, and eventNames() lists them once no monitor remains.
// Untyped helpers that take the emitter and the name as plain values
// reach the string events only, too.
import { EventEmitter, errorMonitor } from "node:events";

const em = new EventEmitter();
em.on(errorMonitor, (err) => console.log("monitor", err.message));

const tail = "errorMonitor";
const nul = "\0events." + tail;
const printed = "Symbol(events." + tail + ")";
em.on("\0events." + tail, (a, b) => console.log("nul", a, b));
em.on("Symbol(events." + tail + ")", (...rest) => console.log("printed", rest.length));
console.log(em.emit("\0events." + tail, 1, "two"));
console.log(em.emit("Symbol(events." + tail + ")", 1, 2, 3));
console.log(em.listenerCount(nul), em.listenerCount(printed), em.listenerCount(errorMonitor));

em.removeAllListeners(nul);
console.log(em.listenerCount(nul), em.listenerCount(printed), em.listenerCount(errorMonitor));
em.removeAllListeners(printed);
console.log(em.listenerCount(nul), em.listenerCount(printed), em.listenerCount(errorMonitor));

try {
  em.emit("error", new Error("monitored"));
} catch (err) {
  console.log("thrown", err.message);
}
em.removeAllListeners(errorMonitor);
em.on("\0events." + tail, (a) => console.log("nul again", a));
console.log(JSON.stringify(em.eventNames()));
console.log(em.emit("\0events." + tail, "last"));

class Service extends EventEmitter {}

function wire(target, name, label) {
  target.on(name, (value) => console.log(label, JSON.stringify(name), value));
}
function fire(target, name, value) {
  return target.emit(name, value);
}
function add(target, name, listener) {
  target.on(name, listener);
}
function unwire(target, name, listener) {
  target.off(name, listener);
}

const service = new Service();
service.on(errorMonitor, (err) => console.log("monitor", err.message));
const names = ["\u0000events.errorMonitor", "Symbol(events.errorMonitor)"];
for (const name of names) wire(service, name, "wired");
for (const name of names) console.log(fire(service, name, name.length));
console.log(service.listenerCount(errorMonitor), service.listenerCount(names[0]));

const extra = (value) => console.log("extra", value);
add(service, names[0], extra);
unwire(service, names[0], extra);
unwire(service, names[0], extra);
console.log(service.listenerCount(errorMonitor), service.listenerCount(names[0]));
try {
  service.emit("error", new Error("monitored"));
} catch (err) {
  console.log("thrown", err.message);
}
