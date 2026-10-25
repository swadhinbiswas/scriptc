// servername: "" sends no SNI, and the certificate is still checked
// against the request's host: a certificate for another name fails with
// ERR_TLS_CERT_ALTNAME_INVALID, and one for the host succeeds. The
// matching server records the SNI names it receives.
import * as http2 from "node:http2";
import * as https from "node:https";
import * as tls from "node:tls";
import { readFileSync } from "node:fs";

const ca = readFileSync("tests/fixtures/server/certs/ca.pem");
const cert = readFileSync("tests/fixtures/server/certs/localhost.pem");
const key = readFileSync("tests/fixtures/server/certs/localhost-key.pem");
const sniNames: string[] = [];

const match = http2.createSecureServer({
  allowHTTP1: true,
  cert,
  key,
  SNICallback: (name: string, cb: (err: Error | null, ctx?: tls.SecureContext) => void) => {
    sniNames.push(name);
    cb(null, undefined);
  },
});
match.on("request", (req: http2.Http2ServerRequest, res: http2.Http2ServerResponse) => {
  res.end(`hello ${req.url}`);
});

const other = https.createServer(
  {
    key: readFileSync("tests/fixtures/server/certs/alt-key.pem"),
    cert: readFileSync("tests/fixtures/server/certs/alt.pem"),
  },
  (req, res) => res.end(`hello ${req.url}`),
);

function get(label: string, port: number, servername: string): Promise<void> {
  return new Promise<void>((resolve) => {
    const req = https.request({ host: "localhost", port, path: `/${label}`, ca: ca, servername, agent: false }, (res) => {
      let body = "";
      res.on("data", (c: Buffer) => (body += c.toString()));
      res.on("end", () => {
        console.log(label, res.statusCode, body, JSON.stringify(sniNames));
        resolve();
      });
    });
    req.on("error", (err: NodeJS.ErrnoException) => {
      console.log(label, "error", err.code);
      resolve();
    });
    req.end();
  });
}

match.listen(0, () => {
  const matchPort = match.address().port;
  other.listen(0, async () => {
    const otherPort = (other.address() as { port: number }).port;
    await get("empty-match", matchPort, "");
    await get("empty-other", otherPort, "");
    await get("named-other", otherPort, "alt.localhost");
    await get("named-match", matchPort, "localhost");
    match.close();
    other.close();
  });
});
