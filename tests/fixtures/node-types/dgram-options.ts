// dgram socket options under @types/node's declarations: the setters'
// results, an errno error, buffer sizes and disconnect().
import * as dgram from "node:dgram";

function attempt(label: string, op: () => unknown): void {
  try {
    console.log(label, JSON.stringify(op()));
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    console.log(label, "throws", err.name, err.code, err.message, err.errno, err.syscall);
  }
}

const server = dgram.createSocket("udp4");
const client = dgram.createSocket("udp4");
server.on("message", (msg: Buffer) => {
  console.log("message", msg.toString());
  server.close();
  client.close();
});
server.bind(0, "127.0.0.1", () => {
  attempt("setBroadcast", () => server.setBroadcast(true));
  attempt("setTTL", () => server.setTTL(32));
  attempt("setTTL 0", () => server.setTTL(0));
  attempt("setMulticastTTL", () => server.setMulticastTTL(4));
  attempt("setMulticastLoopback", () => server.setMulticastLoopback(true));
  attempt("setMulticastInterface", () => server.setMulticastInterface("127.0.0.1"));
  attempt("addMembership", () => server.addMembership("239.1.2.3", "127.0.0.1"));
  attempt("dropMembership", () => server.dropMembership("239.1.2.3", "127.0.0.1"));
  server.setRecvBufferSize(32768);
  console.log("recv buffer", server.getRecvBufferSize() >= 32768);
  console.log("send buffer", server.getSendBufferSize() > 0);
  console.log("queue", server.getSendQueueSize(), server.getSendQueueCount());
  const port = server.address().port;
  client.connect(port, "127.0.0.1", () => {
    client.disconnect();
    attempt("disconnect again", () => client.disconnect());
    client.send("hello", port, "127.0.0.1");
  });
});
