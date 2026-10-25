// Under @types/node: socket.address() (AddressInfo | {}) and
// resetAndDestroy().
import * as net from "node:net";

const server = net.createServer((sock) => {
  sock.on("error", (err: NodeJS.ErrnoException) => console.log("server socket", err.code));
  sock.on("close", () => server.close());
  sock.resume();
});

server.listen(0, "127.0.0.1", () => {
  const port = (server.address() as net.AddressInfo).port;
  const c = net.connect(port, "127.0.0.1");
  console.log("connecting", JSON.stringify(c.address()));
  c.on("connect", () => {
    const local = c.address() as net.AddressInfo;
    console.log("local", local.address, local.family, local.port === c.localPort);
    console.log("reset", c.resetAndDestroy() === c, c.destroyed);
  });
  c.on("close", (hadError: boolean) => console.log("close", hadError, JSON.stringify(c.address())));
});
