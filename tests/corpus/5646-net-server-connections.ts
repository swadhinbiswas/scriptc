// server.maxConnections turns away connections past the cap with a
// 'drop' event carrying their addresses, and getConnections reports the
// open count on the next tick.
import * as net from "node:net";

const server = net.createServer((sock) => {
  sock.on("data", () => {});
});
console.log("default", server.maxConnections);
server.maxConnections = 1;
console.log("set", server.maxConnections);
server.on("drop", (data?: net.DropArgument) => {
  console.log(
    "drop",
    data?.localAddress,
    typeof data?.localPort,
    data?.localFamily,
    data?.remoteAddress,
    typeof data?.remotePort,
    data?.remoteFamily,
  );
});

server.listen(0, "127.0.0.1", () => {
  const port = (server.address() as net.AddressInfo).port;
  const first = net.connect(port, "127.0.0.1", () => {
    const second = net.connect(port, "127.0.0.1");
    second.resume();
    second.on("close", () => {
      console.log("second closed");
      process.nextTick(() => console.log("tick before"));
      const same = server.getConnections((err: Error | null, count: number) => {
        console.log("connections", err, count);
      });
      console.log("getConnections chains", same === server);
      process.nextTick(() => console.log("tick after"));
      Promise.resolve().then(() => console.log("microtask"));
      server.maxConnections = undefined;
      console.log("unset", server.maxConnections);
      first.destroy();
      server.close(() => console.log("server closed"));
    });
  });
});
