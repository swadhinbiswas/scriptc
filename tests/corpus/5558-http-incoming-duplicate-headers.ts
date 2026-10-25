// Repeated incoming header fields follow Node's rules on server requests
// and client responses alike: most fields join with ", ", cookie joins
// with "; ", single-value fields such as user-agent and content-type keep
// the first value, and set-cookie collects every line (read here through
// headersDistinct). A `{ ...req.headers }` copy holds the same values.
import * as http from "node:http";
import * as net from "node:net";

const server = http.createServer((req, res) => {
  console.log("server x-dup", JSON.stringify(req.headers["x-dup"] ?? null));
  console.log("server cookie", JSON.stringify(req.headers.cookie ?? null));
  console.log("server user-agent", JSON.stringify(req.headers["user-agent"] ?? null));
  console.log("server set-cookie", JSON.stringify(req.headersDistinct["set-cookie"] ?? null));
  const copy = { ...req.headers };
  console.log("server spread", Object.keys(copy).join(","), copy["x-dup"], copy.cookie, copy["user-agent"]);
  res.end("ok");
});
const upstream = net.createServer((s) => {
  s.on("data", () => {
    s.end("HTTP/1.1 200 OK\r\nX-Dup: a\r\nX-Dup: b\r\nSet-Cookie: c=1\r\nContent-Type: text/a\r\nContent-Type: text/b\r\nContent-Length: 0\r\n\r\n");
  });
});

server.listen(0, "127.0.0.1", () => {
  const port = (server.address() as { port: number }).port;
  const s = net.connect({ port, host: "127.0.0.1" }, () => {
    s.write("GET / HTTP/1.1\r\nHost: x\r\nConnection: close\r\nX-Dup: 1\r\nX-Dup: 2\r\nCookie: a=1\r\nCookie: b=2\r\nUser-Agent: u1\r\nUser-Agent: u2\r\nSet-Cookie: s=1\r\n\r\n");
  });
  s.on("data", () => {});
  s.on("close", () => {
    server.close();
    upstream.listen(0, "127.0.0.1", () => {
      const up = (upstream.address() as { port: number }).port;
      http.get({ host: "127.0.0.1", port: up, path: "/" }, (res) => {
        console.log("client x-dup", JSON.stringify(res.headers["x-dup"] ?? null));
        console.log("client set-cookie", JSON.stringify(res.headersDistinct["set-cookie"] ?? null));
        console.log("client content-type", JSON.stringify(res.headers["content-type"] ?? null));
        const copy = { ...res.headers };
        console.log("client spread", Object.keys(copy).join(","), copy["x-dup"], copy["content-type"]);
        res.resume();
        res.on("end", () => upstream.close());
      });
    });
  });
});
