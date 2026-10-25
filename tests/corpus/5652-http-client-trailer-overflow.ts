// Oversized heads and trailers fail the exchange with Node's errors and
// leave nothing behind: a client response whose trailers or head run past
// the limit fails the request with "Parse Error: Header overflow" and the
// response it had started settles, and a server answers request trailers
// past the limit with 431. Each case repeats without holding on to
// earlier exchanges.
import * as http from "node:http";
import * as net from "node:net";

const bigTrailer = "X-Big: " + "a".repeat(70000) + "\r\n\r\n";
const bigHead = "HTTP/1.1 200 OK\r\nX-Big: " + "b".repeat(20000) + "\r\nContent-Length: 1\r\n\r\nx";
const peer = net.createServer((socket) => {
  socket.on("data", (d: Buffer) => {
    if (d.toString().startsWith("GET /head")) socket.write(bigHead);
    else socket.write("HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n3\r\nabc\r\n0\r\n" + bigTrailer);
  });
  socket.on("error", () => {});
});

function clientRound(port: number, path: string): Promise<void> {
  return new Promise<void>((resolve) => {
    let body = "";
    const req = http.request({ host: "127.0.0.1", port, path, agent: false }, (res) => {
      res.on("data", (c: Buffer) => (body += c.toString()));
      res.on("error", () => {});
    });
    req.on("error", (err: NodeJS.ErrnoException) => console.log(path, "error", err.code, err.message));
    req.on("close", () => {
      // the body arrives before or after the error depending on the parser
      setTimeout(() => {
        console.log(path, "body", JSON.stringify(body));
        resolve();
      }, 20);
    });
    req.end();
  });
}

const server = http.createServer((req, res) => {
  req.resume();
  req.on("end", () => res.end("ok"));
});

function serverRound(port: number, round: number): Promise<void> {
  return new Promise<void>((resolve) => {
    let out = "";
    const s = net.connect(port, "127.0.0.1", () => {
      s.write(`POST /${round} HTTP/1.1\r\nHost: x\r\nTransfer-Encoding: chunked\r\n\r\n3\r\nabc\r\n0\r\n` + bigTrailer);
    });
    s.on("data", (c: Buffer) => (out += c.toString()));
    s.on("error", () => {});
    s.on("close", () => {
      console.log("server answer", round, JSON.stringify(out.split("\r\n")[0]));
      resolve();
    });
  });
}

peer.listen(0, "127.0.0.1", async () => {
  const port = (peer.address() as { port: number }).port;
  for (let round = 1; round <= 3; round++) await clientRound(port, `/trailer${round}`);
  for (let round = 1; round <= 3; round++) await clientRound(port, `/head${round}`);
  peer.close();
  server.listen(0, "127.0.0.1", async () => {
    const sport = (server.address() as { port: number }).port;
    for (let round = 1; round <= 3; round++) await serverRound(sport, round);
    server.close();
  });
});
