// Response framing follows the request and status: a HEAD request and a
// 204 status send no body and no length header, and an HTTP/1.0 request
// without a set Content-Length gets the body unframed with
// Connection: close.
import * as http from "node:http";
import * as net from "node:net";
const server = http.createServer((req, res) => {
  if (req.url === "/stream") {
    res.write("a");
    setTimeout(() => res.end("b"), 10);
    return;
  }
  if (req.url === "/len") {
    res.setHeader("Content-Length", "2");
    res.end("ok");
    return;
  }
  if (req.url === "/204") res.statusCode = 204;
  res.end("body");
});
const wires = [
  "GET / HTTP/1.0\r\n\r\n",
  "GET / HTTP/1.0\r\nConnection: keep-alive\r\n\r\n",
  "GET /stream HTTP/1.0\r\n\r\n",
  "GET /len HTTP/1.0\r\nConnection: keep-alive\r\n\r\n",
  "HEAD / HTTP/1.0\r\n\r\n",
  "HEAD / HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n",
  "GET /204 HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n",
];
server.listen(0, "127.0.0.1", async () => {
  const port = (server.address() as { port: number }).port;
  for (const w of wires) {
    const d = await new Promise<string>((r) => {
      let d = "";
      const s = net.connect({ port, host: "127.0.0.1" }, () => s.write(w));
      s.on("data", (c: Buffer) => (d += c.toString("latin1")));
      s.on("close", () => r(d));
      setTimeout(() => s.destroy(), 300);
    });
    console.log(JSON.stringify(w.split("\r\n")[0]), JSON.stringify(d.replace(/Date: [^\r]*\r\n/, "")));
  }
  server.close();
});
