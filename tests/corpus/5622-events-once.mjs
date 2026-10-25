// events.once: the next event's arguments as an array, a rejection when
// 'error' fires first, removal of both one-shot listeners, an awaited
// 'error' event, a subclass emitter and an event without arguments.
import { EventEmitter, once } from "node:events";
const ee = new EventEmitter();
setTimeout(() => ee.emit("ready", 1, "two"), 1);
const args = await once(ee, "ready");
console.log("once", JSON.stringify(args), args.length);
setTimeout(() => ee.emit("ready", 3, "four"), 1);
const [n, s] = await once(ee, "ready");
console.log("again", n, s);
setTimeout(() => ee.emit("error", new Error("boom")), 1);
try {
  await once(ee, "ready");
} catch (error) {
  console.log("rejected", error.message);
}
console.log("listeners", ee.listenerCount("ready"), ee.listenerCount("error"));
setTimeout(() => ee.emit("error", new TypeError("as value")), 1);
const [err] = await once(ee, "error");
console.log("error event", err.name, err.message);
setTimeout(() => ee.emit("done"), 1);
console.log("done", JSON.stringify(await once(ee, "done")));
class Job extends EventEmitter {
  start() {
    setTimeout(() => this.emit("finished", { id: 7 }, [1, 2]), 1);
    return this;
  }
}
const job = new Job();
job.start();
const [result, list] = await once(job, "finished");
console.log("subclass", result.id, list.length);
const pending = once(ee, "later");
ee.emit("later", "first");
ee.emit("later", "second");
console.log("first wins", JSON.stringify(await pending), ee.listenerCount("later"));
void once(ee, "never");
console.log("pending", ee.listenerCount("never"), ee.listenerCount("error"));
