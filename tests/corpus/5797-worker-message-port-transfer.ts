import { MessageChannel, MessagePort, Worker, isMainThread, parentPort, workerData } from "node:worker_threads";

// MessagePorts moved to a worker through workerData's and postMessage's
// transferList: the worker answers on them and sees the other end close,
// a port in a message without the transferList throws DataCloneError,
// and a transferred port is inert.
if (isMainThread) {
  const { port1, port2 } = new MessageChannel();
  const worker = new Worker(new URL(import.meta.url), {
    workerData: { port: port2 },
    transferList: [port2],
  });
  const second = new MessageChannel();
  port1.on("message", (m: unknown) => {
    console.log("main got", JSON.stringify(m));
    if (m === "done") port1.close();
  });
  port1.on("close", () => console.log("port1 close"));
  port1.postMessage("hello");
  worker.on("message", (m: unknown) => {
    console.log("from worker", JSON.stringify(m));
    try {
      worker.postMessage({ reply: second.port1 });
    } catch (err) {
      const e = err as Error;
      console.log(e.name, e.message);
    }
    worker.postMessage({ reply: second.port2 }, [second.port2]);
    second.port2.postMessage("ignored after transfer");
  });
  second.port1.on("message", (m: unknown) => {
    console.log("second got", JSON.stringify(m));
    second.port1.close();
  });
  worker.on("exit", (code: number) => console.log("exit", code));
} else {
  const port = (workerData as { port: MessagePort }).port;
  port.on("message", (m: unknown) => {
    port.postMessage(["echo", m]);
    port.postMessage("done");
  });
  port.on("close", () => {
    parentPort!.postMessage("worker port closed");
    parentPort!.once("message", (msg: { reply: MessagePort }) => {
      // the reply port stays open until the main thread closes its end
      msg.reply.on("message", () => {});
      msg.reply.postMessage({ from: "worker" });
    });
  });
}
