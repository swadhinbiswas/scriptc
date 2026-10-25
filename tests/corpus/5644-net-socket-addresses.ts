// A socket's address fields, byte counts and state: the remote fields
// are cached at first read and stay readable after close, the local ones
// are undefined while connecting and after close, and readyState follows
// the open halves.
import * as net from "node:net";

// The server's 'connection' and the client's 'connect' race (either can
// run first), so each side records its line and both print once both
// have run.
let serverLine: string | null = null;
let clientLine: string | null = null;
let startClient: (() => void) | null = null;
function bothConnected(): void {
  if (serverLine === null || clientLine === null || startClient === null) return;
  console.log(serverLine);
  console.log(clientLine);
  startClient();
}

const server = net.createServer((sock) => {
  const port = (server.address() as net.AddressInfo).port;
  serverLine =
    `server side ${sock.remoteAddress} ${sock.remoteFamily} ${typeof sock.remotePort} ` +
    `${sock.localAddress} ${sock.localPort === port} ${sock.localFamily}`;
  bothConnected();
  sock.on("data", (d: Buffer) => {
    console.log("server got", d.toString(), sock.bytesRead);
    sock.end("bye");
  });
});

server.listen(0, "127.0.0.1", () => {
  const port = (server.address() as net.AddressInfo).port;
  const c = net.connect(port, "127.0.0.1");
  console.log(
    "before connect",
    c.readyState,
    c.connecting,
    c.pending,
    c.remoteAddress,
    c.remotePort,
    c.localAddress,
    c.localPort,
    c.bytesRead,
  );
  c.on("connect", () => {
    clientLine =
      `connected ${c.readyState} ${c.connecting} ${c.pending} ${c.remotePort === port} ` +
      `${c.remoteFamily} ${c.localAddress} ${typeof c.localPort} ${c.localFamily}`;
    startClient = () => c.write("hello");
    bothConnected();
  });
  c.on("data", (d: Buffer) => console.log("client got", d.toString(), c.bytesRead));
  c.on("end", () => console.log("end", c.readyState, c.bytesRead, c.bytesWritten));
  c.on("close", () => {
    console.log(
      "closed",
      c.readyState,
      c.pending,
      c.remoteAddress,
      c.remotePort === port,
      c.localAddress,
      c.localPort,
    );
    const d = net.connect(port, "127.0.0.1");
    d.destroy();
    console.log("destroyed before connect", d.readyState, d.connecting, d.pending, d.remoteAddress);
    d.on("close", () => server.close());
  });
});
