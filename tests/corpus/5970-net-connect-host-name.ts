// net.connect resolves a host name through the system resolver before it
// dials. "LOCALHOST" is not the "localhost" literal, so it goes through
// getaddrinfo and the hosts file, as a container service name does.
import * as net from "node:net";

const server = net.createServer((socket) => {
  socket.on("data", (chunk: Buffer) => socket.end("echo: " + chunk.toString()));
});

server.listen(0, () => {
  const { port } = server.address() as net.AddressInfo;
  const client = net.connect(port, "LOCALHOST", () => {
    console.log("connected", net.isIP(client.remoteAddress ?? "") !== 0);
    client.write("hello");
  });
  client.on("data", (chunk: Buffer) => console.log(chunk.toString()));
  client.on("close", () => {
    console.log("client closed");
    const options = net.createConnection({ port, host: "LOCALHOST" });
    options.on("connect", () => {
      console.log("options form connected");
      options.end();
    });
    options.on("close", () => {
      console.log("options form closed");
      server.close(() => console.log("server closed"));
    });
  });
});
