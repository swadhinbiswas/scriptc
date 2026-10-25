// https.request verifies the server certificate against `ca`, using
// `servername` (when given) for SNI and the name check. A failed
// verification reports Node's message and openssl code, and
// rejectUnauthorized: false skips the check. Requests through an
// https.Agent take their TLS options from the request.
import * as https from "node:https";
import { readFileSync } from "node:fs";

const cert = readFileSync("tests/fixtures/server/certs/localhost.pem");
const key = readFileSync("tests/fixtures/server/certs/localhost-key.pem");
const ca = readFileSync("tests/fixtures/server/certs/ca.pem");

const server = https.createServer({ key, cert }, (req, res) => {
  res.end(`hello ${req.url}`);
});

function settle(label: string, start: (resolve: (s: string) => void) => void): Promise<void> {
  return new Promise<string>((resolve) => start(resolve)).then((s) => console.log(label, s));
}

server.listen(0, "127.0.0.1", async () => {
  const port = (server.address() as { port: number }).port;
  await settle("ca", (resolve) => {
    const req = https.request({ host: "localhost", port, path: "/ca", ca: ca }, (res) => {
      let body = "";
      res.on("data", (c: Buffer) => (body += c.toString()));
      res.on("end", () => resolve(`${res.statusCode} ${body}`));
    });
    req.on("error", (err: NodeJS.ErrnoException) => resolve(`error ${err.code} ${err.message}`));
    req.end();
  });
  await settle("noca", (resolve) => {
    const req = https.request({ host: "localhost", port, path: "/noca" }, (res) => {
      res.resume();
      res.on("end", () => resolve(`${res.statusCode}`));
    });
    req.on("error", (err: NodeJS.ErrnoException) => resolve(`error ${err.code} ${err.message}`));
    req.end();
  });
  await settle("insecure", (resolve) => {
    const req = https.request({ host: "localhost", port, path: "/insecure", rejectUnauthorized: false }, (res) => {
      res.resume();
      res.on("end", () => resolve(`${res.statusCode}`));
    });
    req.on("error", (err: NodeJS.ErrnoException) => resolve(`error ${err.code} ${err.message}`));
    req.end();
  });
  await settle("servername", (resolve) => {
    const req = https.request({ host: "127.0.0.1", port, path: "/sni", ca: ca, servername: "localhost" }, (res) => {
      res.resume();
      res.on("end", () => resolve(`${res.statusCode}`));
    });
    req.on("error", (err: NodeJS.ErrnoException) => resolve(`error ${err.code}`));
    req.end();
  });
  await settle("wrong servername", (resolve) => {
    const req = https.request({ host: "localhost", port, path: "/sni", ca: ca, servername: "other.example" }, (res) => {
      res.resume();
      res.on("end", () => resolve(`${res.statusCode}`));
    });
    req.on("error", (err: NodeJS.ErrnoException) => resolve(`error ${err.code}`));
    req.end();
  });
  await settle("agent", (resolve) => {
    const agent = new https.Agent({ maxSockets: 2 });
    const req = https.request({ host: "localhost", port, path: "/agent", agent: agent, ca: ca }, (res) => {
      res.resume();
      res.on("end", () => resolve(`${res.statusCode}`));
    });
    req.on("error", (err: NodeJS.ErrnoException) => resolve(`error ${err.code} ${err.message}`));
    req.end();
  });
  server.close(() => console.log("closed"));
});
