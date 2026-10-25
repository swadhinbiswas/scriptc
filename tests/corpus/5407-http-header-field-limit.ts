// The HTTP server accepts up to 1000 header fields per block (Node's
// default with server.maxHeadersCount unset) and answers 431 past that,
// for the request head and for a chunked request's trailer block. A
// malformed request line answers 400. Both error responses carry only
// Connection: close. Each case uses its own connection, and every field
// is a minimal `h:` line so a whole request fits in one read: the server
// closes after an error response without unread bytes, so the client
// sees the response instead of a reset.
import { createServer } from "node:http";
import { connect } from "node:net";

function fields(name: string, count: number): string {
  return `${name}:\r\n`.repeat(count);
}

const server = createServer((req, res) => {
  let size = 0;
  req.on("data", (chunk: Buffer) => {
    size += chunk.length;
  });
  req.on("end", () => {
    res.end(`fields=${req.rawHeaders.length / 2} trailers=${req.rawTrailers.length / 2} body=${size}`);
  });
});

function exchange(port: number, wire: string): Promise<string> {
  return new Promise<string>((resolve) => {
    let response = "";
    const socket = connect({ port, host: "127.0.0.1" }, () => {
      socket.write(wire);
    });
    socket.on("data", (chunk: Buffer) => {
      response += chunk.toString("latin1");
    });
    // A reset after the response (or instead of it) still ends the case.
    socket.on("error", () => {});
    socket.on("close", () => resolve(response));
  });
}

function show(label: string, response: string): void {
  const status = response.slice(0, response.indexOf("\r\n"));
  if (status.includes(" 200 ")) console.log(label, status, response.slice(response.indexOf("\r\n\r\n") + 4));
  else console.log(label, JSON.stringify(response));
}

server.listen(0, "127.0.0.1", async () => {
  const { port } = server.address() as { port: number };
  const head = "GET / HTTP/1.1\r\nHost: x\r\nConnection: close\r\n";
  show("head 1000", await exchange(port, head + fields("h", 998) + "\r\n"));
  show("head 1001", await exchange(port, head + fields("h", 999) + "\r\n"));
  show("head 1500", await exchange(port, head + fields("h", 1498) + "\r\n"));
  const post = "POST / HTTP/1.1\r\nHost: x\r\nConnection: close\r\nTransfer-Encoding: chunked\r\n";
  show("trailers 1000", await exchange(port, post + fields("h", 500) + "\r\n3\r\nabc\r\n0\r\n" + fields("t", 1000) + "\r\n"));
  show("trailers 1001", await exchange(port, post + "\r\n3\r\nabc\r\n0\r\n" + fields("t", 1001) + "\r\n"));
  show("malformed", await exchange(port, "GARBAGE\r\n\r\n"));
  server.close();
});
