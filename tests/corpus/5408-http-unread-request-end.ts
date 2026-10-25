// A request the handler never reads still emits 'end': when the response
// finishes, the server dumps the unread body and the request ends, before
// the response's 'close' for an empty body and after it otherwise. A body
// that arrives with the head reaches 'data' listeners even when the
// handler responds first, and resume() alone also ends the request.
import { createServer } from "node:http";
import { connect } from "node:net";

const server = createServer((req, res) => {
  const tag = `${req.method} ${req.url}`;
  req.on("end", () => console.log("req end", tag, req.complete));
  req.on("close", () => console.log("req close", tag));
  res.on("finish", () => console.log("res finish", tag));
  res.on("close", () => console.log("res close", tag));
  if (req.url === "/data") {
    req.on("data", (chunk: Buffer) => console.log("data", tag, chunk.toString()));
  }
  if (req.url === "/resume") req.resume();
  if (req.url === "/late") {
    setTimeout(() => res.end("late"), 20);
    return;
  }
  res.end("ok");
});

const wires = [
  "GET / HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n",
  "POST /cl0 HTTP/1.1\r\nHost: x\r\nConnection: close\r\nContent-Length: 0\r\n\r\n",
  "POST /chunk0 HTTP/1.1\r\nHost: x\r\nConnection: close\r\nTransfer-Encoding: chunked\r\n\r\n0\r\n\r\n",
  "POST /chunk HTTP/1.1\r\nHost: x\r\nConnection: close\r\nTransfer-Encoding: chunked\r\n\r\n3\r\nabc\r\n0\r\n\r\n",
  "POST /body HTTP/1.1\r\nHost: x\r\nConnection: close\r\nContent-Length: 3\r\n\r\nabc",
  "POST /data HTTP/1.1\r\nHost: x\r\nConnection: close\r\nContent-Length: 3\r\n\r\nabc",
  "POST /resume HTTP/1.1\r\nHost: x\r\nConnection: close\r\nContent-Length: 3\r\n\r\nabc",
  "GET /resume HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n",
  "POST /late HTTP/1.1\r\nHost: x\r\nConnection: close\r\nContent-Length: 3\r\n\r\nabc",
];

function exchange(port: number, wire: string): Promise<void> {
  return new Promise<void>((resolve) => {
    const socket = connect({ port, host: "127.0.0.1" }, () => {
      socket.write(wire);
    });
    socket.on("data", () => {});
    socket.on("close", () => resolve());
  });
}

const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

server.listen(0, "127.0.0.1", async () => {
  const { port } = server.address() as { port: number };
  for (const wire of wires) {
    await exchange(port, wire);
    await pause(20);
    console.log("--");
  }
  server.close();
});
