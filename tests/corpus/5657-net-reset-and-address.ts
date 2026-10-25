// socket.address() answers { address, family, port } while the socket has
// a local address and {} while it connects or once it is destroyed.
// resetAndDestroy() closes with an RST (the peer reads ECONNRESET), waits
// for 'connect' on a connecting socket, leaves a destroyed socket alone
// and answers the socket. server.dropMaxConnection is a stored value.
import * as net from "node:net";

let serverLines: string[] = [];
const server = net.createServer((s) => {
  s.on("error", (e: Error) => serverLines.push(`server socket error ${(e as NodeJS.ErrnoException).code}`));
  s.on("close", (hadError: boolean) => {
    serverLines.push(`server socket close ${hadError}`);
    if (serverLines.length === 4) {
      for (const line of serverLines) console.log(line);
      server.close(() => console.log("server closed"));
    }
  });
  s.resume();
});
console.log("dropMaxConnection", server.dropMaxConnection);
server.dropMaxConnection = true;
console.log("dropMaxConnection set", server.dropMaxConnection);

server.listen(0, "127.0.0.1", () => {
  const port = (server.address() as net.AddressInfo).port;
  const a = net.connect(port, "127.0.0.1", () => {
    const addr = a.address() as net.AddressInfo;
    console.log("connected", addr.address, addr.family, addr.port === a.localPort, Object.keys(addr).join());
    const same = a.resetAndDestroy();
    console.log("reset", same === a, a.destroyed, JSON.stringify(a.address()));
    a.resetAndDestroy();
    console.log("reset again", a.destroyed);
  });
  a.on("close", (hadError: boolean) => {
    console.log("a close", hadError);
    const b = net.connect(port, "127.0.0.1");
    console.log("connecting", b.connecting, JSON.stringify(b.address()));
    b.resetAndDestroy();
    console.log("deferred", b.destroyed);
    b.on("connect", () => console.log("b connect", b.destroyed));
    b.on("close", (hadError: boolean) => console.log("b close", hadError, JSON.stringify(b.address())));
  });
});
