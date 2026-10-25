/* A client request's chunked writes: once the request has its socket, the
 * writes of one tick (and an end() chunk) go out as one chunk; writes made
 * before the 'socket' event keep a chunk each. The raw server prints the body as
 * it arrived on the wire. */
import { createServer } from "node:net";
import { request } from "node:http";

const server = createServer((socket) => {
  let data = "";
  socket.on("data", (chunk: Buffer) => {
    data += chunk.toString("latin1");
    if (data.endsWith("0\r\n\r\n")) {
      console.log(JSON.stringify(data.slice(data.indexOf("\r\n\r\n") + 4)));
      socket.end("HTTP/1.1 200 OK\r\nContent-Length: 0\r\nConnection: close\r\n\r\n");
      server.close();
    }
  });
});

server.listen(0, "127.0.0.1", () => {
  const port = (server.address() as { port: number }).port;
  const req = request(
    { host: "127.0.0.1", port, method: "POST", headers: { "transfer-encoding": "chunked" } },
    (res) => {
      res.resume();
      res.on("end", () => console.log("response", res.statusCode));
    },
  );
  req.write("a");
  req.write("b");
  req.on("socket", () => {
    req.write("c");
    req.write("d");
    setImmediate(() => {
      req.write("e");
      req.end("f");
    });
  });
});
