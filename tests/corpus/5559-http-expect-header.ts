// With no 'checkContinue' or 'checkExpectation' listener, the server
// answers an HTTP/1.1 `Expect: 100-continue` with "100 Continue" before
// the 'request' handler runs, and answers any other expectation with 417
// without calling the handler. HTTP/1.0 requests ignore Expect. With the
// listeners, they take those requests instead of 'request', and the
// client's 'continue' event fires on the 100 response.
import * as http from "node:http";
import * as net from "node:net";
const server = http.createServer((req, res) => res.end("body"));
const cases = ["100-continue", "100-Continue, foo", "foo", "x100-continue"];
server.listen(0, "127.0.0.1", async () => {
  const port = (server.address() as { port: number }).port;
  for (const e of cases) {
    const d = await new Promise<string>((r) => {
      let d = "";
      const s = net.connect({ port, host: "127.0.0.1" }, () => s.write(`GET / HTTP/1.1\r\nHost: x\r\nConnection: close\r\nExpect: ${e}\r\n\r\n`));
      s.on("data", (c: Buffer) => (d += c.toString("latin1")));
      s.on("close", () => r(d));
    });
    console.log(e, JSON.stringify(d.replace(/Date: [^\r]*\r\n/, "")));
  }
  const http10 = await new Promise<string>((r) => {
    let d = "";
    const s = net.connect({ port, host: "127.0.0.1" }, () => s.write("GET / HTTP/1.0\r\nExpect: foo\r\n\r\n"));
    s.on("data", (c: Buffer) => (d += c.toString("latin1")));
    s.on("close", () => r(d));
  });
  console.log("1.0", JSON.stringify(http10.replace(/Date: [^\r]*\r\n/, "")));
  server.close(() => withListeners());
});


const listening = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c: Buffer) => (body += c.toString()));
  req.on("end", () => res.end(`request ${body}`));
});
listening.on("checkContinue", (req, res) => {
  console.log("checkContinue", req.headers.expect);
  res.writeContinue();
  let body = "";
  req.on("data", (c: Buffer) => (body += c.toString()));
  req.on("end", () => res.end(`continued ${body}`));
});
listening.on("checkExpectation", (req, res) => {
  console.log("checkExpectation", req.headers.expect);
  res.statusCode = 202;
  res.end("expectation seen");
});

function rawWith(port: number, wire: string, after?: string): Promise<string> {
  return new Promise<string>((resolve) => {
    let out = "";
    const s = net.connect({ port, host: "127.0.0.1" }, () => {
      s.write(wire);
      if (after !== undefined) setTimeout(() => s.write(after), 50);
    });
    s.on("data", (c: Buffer) => (out += c.toString("latin1")));
    s.on("close", () => resolve(JSON.stringify(out.replace(/Date: [^\r]*\r\n/, ""))));
  });
}

function withListeners(): void {
  listening.listen(0, "127.0.0.1", async () => {
  const port = (listening.address() as { port: number }).port;
  console.log(await rawWith(port, "POST / HTTP/1.1\r\nHost: x\r\nConnection: close\r\nExpect: 100-continue\r\nContent-Length: 3\r\n\r\n", "abc"));
  console.log(await rawWith(port, "GET / HTTP/1.1\r\nHost: x\r\nConnection: close\r\nExpect: other\r\n\r\n"));
  await new Promise<void>((resolve) => {
    const req = http.request({
      host: "127.0.0.1",
      port,
      method: "POST",
      headers: { expect: "100-continue", "content-length": "2", connection: "close" },
    });
    req.on("continue", () => {
      console.log("client continue");
      req.end("hi");
    });
    req.on("response", (res) => {
      let body = "";
      res.on("data", (c: Buffer) => (body += c.toString()));
      res.on("end", () => {
        console.log("client response", res.statusCode, body);
        resolve();
      });
    });
    req.flushHeaders();
  });
  listening.close();
  });
}
