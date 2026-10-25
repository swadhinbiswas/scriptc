// Under @types/node: server.address() is `string | AddressInfo | null`
// (null before listen and after close), headers["set-cookie"] is Node's
// string[] of every Set-Cookie line, and `{ ...req.headers }` keeps it as
// an array beside the joined repeated fields.
import * as http from "node:http";
import * as net from "node:net";

const server = http.createServer((req, res) => {
  if (req.url === "/client") {
    res.setHeader("Set-Cookie", ["a=1", "b=2"]);
    res.end("ok");
    return;
  }
  console.log("server set-cookie", JSON.stringify(req.headers["set-cookie"] ?? null));
  console.log("server x-dup", JSON.stringify(req.headers["x-dup"] ?? null));
  console.log("server spread", JSON.stringify({ ...req.headers }));
  res.end("ok");
});

console.log("before listen", server.address());
server.listen(0, "127.0.0.1", () => {
  const address = server.address();
  if (address === null || typeof address !== "object") throw new Error("expected an AddressInfo");
  console.log("listening", address.address, address.family);
  const socket = net.connect({ port: address.port, host: "127.0.0.1" }, () => {
    socket.write("GET / HTTP/1.1\r\nHost: x\r\nConnection: close\r\nX-Dup: 1\r\nX-Dup: 2\r\nSet-Cookie: s=1\r\nSet-Cookie: s=2\r\n\r\n");
  });
  socket.on("data", () => {});
  socket.on("close", () => {
    http.get({ host: "127.0.0.1", port: address.port, path: "/client" }, (res) => {
      console.log("client set-cookie", JSON.stringify(res.headers["set-cookie"] ?? null));
      res.resume();
      res.on("end", () => {
        server.close(() => console.log("after close", server.address()));
        server.closeAllConnections();
      });
    });
  });
});
