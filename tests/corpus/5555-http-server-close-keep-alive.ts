// server.close() closes idle keep-alive connections at once. A connection
// with a response in flight stays open after that response and is closed
// when its keep-alive timeout (keepAliveTimeout + keepAliveTimeoutBuffer)
// expires, and then the server emits 'close'.
import { createServer } from "node:http";
import { connect } from "node:net";

const started = Date.now();
const elapsed = (): string => (Date.now() - started < 1000 ? "early" : "late");

const server = createServer((req, res) => {
  if (req.url === "/hold") setTimeout(() => res.end("held"), 100);
  else res.end("ok");
});
server.keepAliveTimeout = 400;
server.keepAliveTimeoutBuffer = 800;

function open(port: number, path: string, label: string): void {
  const socket = connect({ port, host: "127.0.0.1" }, () => {
    socket.write(`GET ${path} HTTP/1.1\r\nHost: x\r\n\r\n`);
  });
  let data = "";
  socket.on("data", (chunk: Buffer) => {
    data += chunk.toString("latin1");
  });
  socket.on("close", () => {
    console.log(label, "closed", elapsed(), JSON.stringify(data.replace(/Date: [^\r]*\r\n/, "")));
  });
}

server.listen(0, "127.0.0.1", () => {
  const port = (server.address() as { port: number }).port;
  open(port, "/", "idle");
  setTimeout(() => {
    open(port, "/hold", "busy");
    setTimeout(() => {
      server.close(() => console.log("server closed", elapsed()));
      console.log("close called", server.listening);
    }, 30);
  }, 30);
});
