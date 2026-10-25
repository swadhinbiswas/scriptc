// Node's default maxHeaderSize (16 KiB) bounds the request target plus
// every header name and value. The server answers 431 at the limit, and
// a client fails with HPE_HEADER_OVERFLOW on a larger response head. The
// maxHeaderSize option of createServer and http.request sets the bound,
// and a negative or non-integer value throws ERR_OUT_OF_RANGE.
import * as http from "node:http";
import * as net from "node:net";
const server = http.createServer((req, res) => res.end("ok"));
let size = 0;
const upstream = net.createServer((s) => {
  s.on("error", () => {});
  s.on("data", () => s.end(`HTTP/1.1 200 OK\r\nX-Big: ${"y".repeat(size)}\r\nContent-Length: 2\r\n\r\nok`));
});
function send(port: number, wire: string): Promise<string> {
  return new Promise<string>((r) => {
    let d = "";
    const s = net.connect({ port, host: "127.0.0.1" }, () => s.write(wire));
    s.on("data", (c: Buffer) => (d += c.toString("latin1")));
    s.on("error", () => {});
    s.on("close", () => r(d.split("\r\n")[0]!));
  });
}
function get(port: number): Promise<string> {
  return new Promise<string>((r) => {
    const req = http.get({ host: "127.0.0.1", port, agent: false }, (res) => {
      res.resume();
      res.on("end", () => r(`status ${res.statusCode}`));
    });
    req.on("error", (err: NodeJS.ErrnoException) => r(`error ${err.code} ${err.message}`));
  });
}
server.listen(0, "127.0.0.1", async () => {
  const port = (server.address() as { port: number }).port;
  const base = "GET / HTTP/1.1\r\nHost: x\r\nConnection: close\r\nX-Big: ";
  for (const n of [16357, 16358, 30000]) console.log("server", n, await send(port, base + "y".repeat(n) + "\r\n\r\n"));
  server.close();
  upstream.listen(0, "127.0.0.1", async () => {
    const up = (upstream.address() as { port: number }).port;
    for (const n of [16361, 16362, 40000]) {
      size = n;
      console.log("client", n, await get(up));
    }
    upstream.close(() => withOption());
  });
});


const small = http.createServer({ maxHeaderSize: 100 }, (req, res) => res.end("ok"));
const smallUpstream = net.createServer((s) => {
  s.on("error", () => {});
  s.on("data", () => s.end(`HTTP/1.1 200 OK\r\nX-Big: ${"y".repeat(80)}\r\nContent-Length: 2\r\n\r\nok`));
});

function sendSmall(port: number, wire: string): Promise<string> {
  return new Promise<string>((r) => {
    let d = "";
    const s = net.connect({ port, host: "127.0.0.1" }, () => s.write(wire));
    s.on("data", (c: Buffer) => (d += c.toString("latin1")));
    s.on("error", () => {});
    s.on("close", () => r(d.split("\r\n")[0]!));
  });
}

function withOption(): void {
for (const bad of [-1, 1.5]) {
  try {
    http.createServer({ maxHeaderSize: bad }, () => {});
  } catch (err) {
    console.log("createServer", bad, (err as NodeJS.ErrnoException).code, (err as Error).message);
  }
}

small.listen(0, "127.0.0.1", async () => {
  const port = (small.address() as { port: number }).port;
  const base = "GET / HTTP/1.1\r\nHost: x\r\nConnection: close\r\nX-Big: ";
  for (const n of [70, 74, 75, 200]) console.log("server", n, await sendSmall(port, base + "y".repeat(n) + "\r\n\r\n"));
  small.close();
  smallUpstream.listen(0, "127.0.0.1", async () => {
    const up = (smallUpstream.address() as { port: number }).port;
    for (const limit of [50, 200]) {
      const result = await new Promise<string>((resolve) => {
        const req = http.get({ host: "127.0.0.1", port: up, path: "/", maxHeaderSize: limit }, (res) => {
          res.resume();
          res.on("end", () => resolve(`status ${res.statusCode}`));
        });
        req.on("error", (err: NodeJS.ErrnoException) => resolve(`error ${err.code}`));
      });
      console.log("client", limit, result);
    }
    try {
      http.get({ host: "127.0.0.1", port: up, path: "/", maxHeaderSize: -5 });
    } catch (err) {
      console.log("request", (err as NodeJS.ErrnoException).code, (err as Error).message);
    }
    smallUpstream.close();
  });
});
}
