import { MessageChannel, receiveMessageOnPort, type MessagePort } from "node:worker_threads";

// MessageChannel within one thread: hasRef, the validation errors,
// receiveMessageOnPort, close() reaching the other port after its queued
// messages, and the batch that close() inside a listener still delivers.
const a = new MessageChannel();
console.log("hasRef new", a.port1.hasRef(), a.port2.hasRef());
a.port1.on("message", () => {});
console.log("hasRef listener", a.port1.hasRef());
a.port1.unref();
console.log("hasRef unref", a.port1.hasRef());
a.port1.ref();
console.log("hasRef ref", a.port1.hasRef());
a.port1.close();
console.log("hasRef closed", a.port1.hasRef());
const c = new MessageChannel();
const checks: Array<() => void> = [
  () => c.port1.postMessage(c.port2),
  () => c.port1.postMessage({ p: c.port2 }),
  () => c.port1.postMessage(1, [c.port1]),
  () => receiveMessageOnPort({} as MessagePort),
];
for (const check of checks) {
  try {
    check();
    console.log("ok");
  } catch (err) {
    const e = err as Error;
    console.log(e.name, e.message);
  }
}
c.port1.close();
const d = new MessageChannel();
d.port1.postMessage("before close");
d.port1.close();
d.port1.postMessage("after close");
console.log("d2 receive", JSON.stringify(receiveMessageOnPort(d.port2)), JSON.stringify(receiveMessageOnPort(d.port2)));
d.port2.on("close", () => console.log("d2 close"));
d.port1.on("close", () => console.log("d1 close"));
const e = new MessageChannel();
e.port2.on("message", (m: unknown) => {
  console.log("e message", m);
  if (m === 2) e.port2.close();
});
e.port1.on("close", () => console.log("e1 close"));
e.port2.on("close", () => console.log("e2 close"));
e.port1.postMessage(1);
e.port1.postMessage(2);
e.port1.postMessage(3);
setImmediate(() => console.log("immediate"));
process.on("exit", () => console.log("exit"));
