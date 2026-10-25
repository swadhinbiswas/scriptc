// socket.unref() and server.unref() let the process exit while the handle
// is open, and ref() undoes it. An unref'd socket still delivers its events
// while other work (here a timer) keeps the loop running.
import * as net from "node:net";
import * as http from "node:http";

const server = net.createServer((socket) => {
  socket.unref();
  socket.on("data", (d: Buffer) => socket.write(`echo ${d.toString()}`));
});
server.listen(0, "127.0.0.1", () => {
  const port = (server.address() as { port: number }).port;
  server.unref();
  const client = net.connect({ port, host: "127.0.0.1" }, () => {
    client.write("hi");
  });
  client.on("data", (d: Buffer) => {
    console.log("client got", d.toString());
    client.unref();
    setTimeout(() => console.log("timer still ran"), 50);
  });
  const web = http.createServer((req, res) => res.end("ok"));
  web.listen(0, "127.0.0.1", () => {
    web.unref();
    web.ref();
    web.unref();
    console.log("web unref'd");
  });
});
process.on("exit", () => console.log("exit"));
