// events.once under @types/node, which types the result Promise<any[]>:
// narrowed to unknown[], the arguments arrive as checked-dynamic values.
import { EventEmitter, once } from "node:events";
const ee = new EventEmitter();
setTimeout(() => ee.emit("ready", 1, "two"), 1);
const args = (await once(ee, "ready")) as unknown[];
console.log("once", JSON.stringify(args), args.length);
setTimeout(() => ee.emit("ready", 3, "four"), 1);
const [n, s] = (await once(ee, "ready")) as unknown[];
console.log("again", n, typeof s, String(s).toUpperCase());
setTimeout(() => ee.emit("error", new Error("boom")), 1);
try {
  await once(ee, "ready");
} catch (error) {
  console.log("rejected", (error as Error).message);
}
console.log("listeners", ee.listenerCount("ready"), ee.listenerCount("error"));

