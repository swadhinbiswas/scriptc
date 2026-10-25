// After socket.setEncoding("utf8"), every 'data' listener receives the
// string Node passes, whether its chunk parameter is unannotated,
// annotated Buffer, string or string | Buffer. A Buffer-only method on
// the string throws Node's TypeError. A socket without an encoding in
// the same program still receives Buffers.
import * as net from "node:net";

const server = net.createServer((socket) => {
  socket.on("data", (chunk) => {
    console.log("server chunk:", typeof chunk, chunk.length, "bytes:", chunk[0]);
    socket.end("hello wörld");
  });
});

server.listen(0, "127.0.0.1", () => {
  const { port } = server.address() as net.AddressInfo;
  const client = net.connect(port, "127.0.0.1", () => client.write("hi"));
  client.setEncoding("utf8");
  let text = "";
  client.on("data", (chunk) => {
    text += chunk;
    console.log("unannotated:", typeof chunk, chunk.length, chunk);
    console.log("unannotated upper:", chunk.toString().toUpperCase());
  });
  client.on("data", (chunk: Buffer) => {
    console.log("annotated Buffer:", typeof chunk, chunk);
    console.log("annotated concat:", "<" + chunk + ">");
    try {
      console.log(chunk.readUInt8(0));
    } catch (error) {
      console.log("readUInt8:", (error as Error).name, (error as Error).message);
    }
  });
  client.once("data", (chunk: string) => console.log("string:", chunk.split(" ")));
  client.on("data", (chunk: string | Buffer) =>
    console.log("union:", typeof chunk === "string" ? "string " + chunk : "buffer"),
  );
  client.on("close", () => {
    console.log("text:", text);
    server.close();
  });
});
