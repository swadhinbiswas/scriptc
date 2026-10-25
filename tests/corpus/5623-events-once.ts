// events.once under the fallback declarations: Promise<unknown[]>.
import { EventEmitter, once } from "node:events";
const ee = new EventEmitter();
setTimeout(() => ee.emit("ready", 1, "two"), 1);
const args = await once(ee, "ready");
console.log("once", JSON.stringify(args), args.length);
setTimeout(() => ee.emit("ready", 3, "four"), 1);
const [n, s] = await once(ee, "ready");
console.log("again", n, typeof s, String(s).toUpperCase());
setTimeout(() => ee.emit("error", new Error("boom")), 1);
try {
  await once(ee, "ready");
} catch (error) {
  console.log("rejected", (error as Error).message);
}
console.log("listeners", ee.listenerCount("ready"), ee.listenerCount("error"));
// A throwing 'newListener' listener rejects the promise, and the listener
// it announced is not added; when only the 'error' announcement throws, the
// event's listener stays registered.
const guarded = new EventEmitter();
guarded.on("newListener", (name: string) => {
  if (name === "ready") throw new Error("no " + name);
});
await once(guarded, "ready").then(
  () => console.log("fulfilled"),
  (error: Error) => console.log("rejected", error.message),
);
console.log("guarded", guarded.listenerCount("ready"), guarded.listenerCount("error"));
const errorGuarded = new EventEmitter();
errorGuarded.on("newListener", (name: string) => {
  if (name === "error") throw new Error("no error listener");
});
await once(errorGuarded, "go").then(
  () => console.log("fulfilled"),
  (error: Error) => console.log("rejected", error.message),
);
console.log("error guarded", errorGuarded.listenerCount("go"), errorGuarded.listenerCount("error"));
errorGuarded.emit("go", 1);
console.log("after emit", errorGuarded.listenerCount("go"));

export {};
