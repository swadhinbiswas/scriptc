// Queued MessagePort messages arrive as one batch before setImmediate,
// with nextTicks and microtasks run after each message.
import { MessageChannel } from "node:worker_threads";
const { port1, port2 } = new MessageChannel();
port1.on("message", (m: unknown) => {
  console.log("message", m);
  Promise.resolve().then(() => console.log("microtask after", m));
  process.nextTick(() => console.log("tick after", m));
});
port2.postMessage(1);
port2.postMessage(2);
port2.postMessage(3);
setImmediate(() => {
  console.log("immediate");
  port1.close();
});
