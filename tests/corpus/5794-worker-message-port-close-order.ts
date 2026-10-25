// MessagePort close order: a port's own 'close' runs after the loop's
// poll phase, and the other end's close notice arrives in the next one,
// after its queued messages, while something keeps the loop alive.
import { MessageChannel } from "node:worker_threads";
const d = new MessageChannel();
d.port2.on("close", () => console.log("d2 close (peer)"));
d.port1.on("close", () => console.log("d1 close (own)"));
d.port1.close();
const f = new MessageChannel();
f.port1.on("message", (m: unknown) => console.log("f got", m));
f.port2.postMessage("x");
f.port2.close();
f.port1.on("close", () => console.log("f1 close (peer, after messages)"));
setTimeout(() => console.log("timer"), 30);
