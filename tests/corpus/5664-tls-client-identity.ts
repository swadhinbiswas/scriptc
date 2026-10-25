// A TLS client always checks the server certificate against one name: a
// non-empty servername, otherwise the host. An IP-literal host must be one
// of the certificate's IP SANs, and sends no SNI. servername: "" sends no
// SNI and still checks the host, for https.request and tls.connect alike;
// with rejectUnauthorized: false, tls.connect reports the mismatch through
// authorized and authorizationError. The servers record the SNI names they
// receive.
import * as http2 from "node:http2";
import * as https from "node:https";
import * as tls from "node:tls";
import type { ClientRequest } from "node:http";
import { readFileSync } from "node:fs";

const ca = readFileSync("tests/fixtures/server/certs/ca.pem");
const sniNames: string[] = [];

function server(certName: string): http2.Http2SecureServer {
  const s = http2.createSecureServer({
    allowHTTP1: true,
    cert: readFileSync(`tests/fixtures/server/certs/${certName}.pem`),
    key: readFileSync(`tests/fixtures/server/certs/${certName}-key.pem`),
    SNICallback: (name: string, cb: (err: Error | null, ctx?: tls.SecureContext) => void) => {
      sniNames.push(`${certName}:${name}`);
      cb(null, undefined);
    },
  });
  s.on("request", (req: http2.Http2ServerRequest, res: http2.Http2ServerResponse) => {
    res.end(`hello ${req.url}`);
  });
  return s;
}

const matching = server("localhost"); // DNS:localhost, IP:127.0.0.1, IP:::1
const other = server("alt"); // DNS:alt.localhost only

function report(label: string, req: ClientRequest, resolve: () => void): void {
  req.on("response", (res) => {
    let body = "";
    res.on("data", (c: Buffer) => (body += c.toString()));
    res.on("end", () => {
      console.log(label, res.statusCode, body);
      resolve();
    });
  });
  req.on("error", (err) => {
    console.log(label, (err as NodeJS.ErrnoException).code);
    resolve();
  });
  req.end();
}

function get(label: string, port: number): Promise<void> {
  return new Promise<void>((resolve) => {
    report(label, https.request({ host: "127.0.0.1", port, path: `/${label}`, ca, agent: false }), resolve);
  });
}

function getEmptyServername(label: string, port: number): Promise<void> {
  return new Promise<void>((resolve) => {
    const req = https.request({ host: "127.0.0.1", port, path: `/${label}`, ca, servername: "", agent: false });
    report(label, req, resolve);
  });
}

function connect(label: string, port: number, rejectUnauthorized: boolean): Promise<void> {
  return new Promise<void>((resolve) => {
    const socket = tls.connect({ host: "localhost", port, ca, servername: "", rejectUnauthorized }, () => {
      console.log(label, "authorized", socket.authorized, socket.authorizationError ?? null);
      socket.end();
    });
    socket.on("error", (err) => {
      console.log(label, (err as NodeJS.ErrnoException).code);
      resolve();
    });
    socket.on("close", () => resolve());
  });
}

matching.listen(0, () => {
  other.listen(0, async () => {
    const good = (matching.address() as { port: number }).port;
    const bad = (other.address() as { port: number }).port;
    await get("ip", good);
    await get("ip-other", bad);
    await getEmptyServername("ip-empty", good);
    await getEmptyServername("ip-empty-other", bad);
    await connect("connect-empty", good, true);
    await connect("connect-empty-other", bad, true);
    await connect("connect-empty-other-unverified", bad, false);
    console.log("sni", sniNames.length === 0 ? "none" : sniNames.join(","));
    matching.close();
    other.close();
  });
});
