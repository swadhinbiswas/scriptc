// A keep-alive connection that stays idle after a response is closed by
// the server once keepAliveTimeout + keepAliveTimeoutBuffer elapse. The
// response's Keep-Alive header gives keepAliveTimeout in whole seconds and
// is omitted when keepAliveTimeout is 0, which also disables the timer.
import { createServer } from "node:http";
import { connect } from "node:net";

function exchange(keepAliveTimeout: number, buffer: number): Promise<void> {
  return new Promise<void>((done) => {
    const server = createServer((req, res) => res.end("ok"));
    server.keepAliveTimeout = keepAliveTimeout;
    server.keepAliveTimeoutBuffer = buffer;
    server.listen(0, "127.0.0.1", () => {
      const port = (server.address() as { port: number }).port;
      const started = Date.now();
      const socket = connect({ port, host: "127.0.0.1" }, () => {
        socket.write("GET / HTTP/1.1\r\nHost: x\r\n\r\n");
      });
      let head = "";
      socket.on("data", (chunk: Buffer) => {
        head += chunk.toString("latin1");
      });
      let byClient = false;
      const fallback = setTimeout(() => {
        byClient = true;
        socket.destroy();
      }, 1500);
      socket.on("close", () => {
        clearTimeout(fallback);
        const waited = Date.now() - started;
        const keepAlive = /Keep-Alive: [^\r]*/.exec(head)?.[0] ?? "no Keep-Alive header";
        const outcome = byClient
          ? "still open after 1500 ms"
          : waited >= keepAliveTimeout + buffer - 50
            ? "closed by the server after the timeout"
            : "closed by the server early";
        console.log(keepAliveTimeout, keepAlive, outcome);
        server.close(() => done());
      });
    });
  });
}

await exchange(200, 100);
await exchange(1100, 0);
await exchange(0, 100);
