// The same socket members through untyped handles: address() and
// resetAndDestroy() on a socket held in an untyped binding, a TLS
// socket's resetAndDestroy() throwing ERR_INVALID_HANDLE_TYPE, and
// dropMaxConnection on an untyped server.
const net = require("node:net");
const tls = require("node:tls");
const { readFileSync } = require("node:fs");

const key = readFileSync("tests/fixtures/server/certs/localhost-key.pem");
const cert = readFileSync("tests/fixtures/server/certs/localhost.pem");
let server;
server = net.createServer((s) => {
  s.on("error", (e) => console.log("server socket error", e.code));
  s.on("close", () => {
    console.log("server socket closed");
    secure.listen(0, "127.0.0.1", () => {
      const t = tls.connect({ port: secure.address().port, host: "127.0.0.1", rejectUnauthorized: false });
      t.on("error", () => {});
      try {
        t.resetAndDestroy();
      } catch (e) {
        console.log("tls", e.name, e.code, e.message);
      }
      t.destroy();
      secure.close();
      server.close();
    });
  });
  s.resume();
});
const secure = tls.createServer({ key, cert }, (s) => s.end());
console.log("dropMaxConnection", server.dropMaxConnection);
server.dropMaxConnection = false;
console.log("dropMaxConnection set", server.dropMaxConnection);
server.listen(0, "127.0.0.1", () => {
  let c;
  c = net.connect(server.address().port, "127.0.0.1", () => {
    const addr = c.address();
    console.log("address", addr.address, addr.family, typeof addr.port);
    console.log("reset answers the socket", c.resetAndDestroy() === c);
    console.log("after", JSON.stringify(c.address()));
  });
  c.on("close", (hadError) => console.log("client close", hadError));
});
