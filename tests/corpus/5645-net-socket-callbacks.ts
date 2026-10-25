// write and end callbacks, close listeners with hadError, the 'ready'
// event, string 'data' chunks after setEncoding, setTimeout with a callback (and its msecs checks) and
// setKeepAlive's chaining.
import * as net from "node:net";

// Each side keeps its own list: the client's callbacks and the server's
// events can interleave either way, so the lists print one after the
// other at the end.
const events: string[] = [];
const serverEvents: string[] = [];
let serverSockets = 0;
const server = net.createServer((sock) => {
  sock.setEncoding("utf8");
  sock.on("data", (d: string) => {
    serverEvents.push(`server data ${typeof d} ${d}`);
    sock.end("pong", () => serverEvents.push("server end callback"));
  });
  // the first connection's server side (the timeout connection's close
  // order against the client's depends on the event loop phase)
  if (serverSockets++ === 0) {
    sock.on("close", (hadError: boolean) => serverEvents.push(`server close ${hadError}`));
  }
});

function attempt(label: string, f: () => void): void {
  try {
    f();
    events.push(`${label} ok`);
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    events.push(`${label} ${e.name} ${e.code} ${e.message}`);
  }
}

server.listen(0, "127.0.0.1", () => {
  const port = (server.address() as net.AddressInfo).port;
  const c = net.connect(port, "127.0.0.1");
  c.on("connect", () => {
    events.push("connect");
    c.write("ping", (err?: Error | null) => events.push(`write callback ${err === null}`));
    events.push(`setKeepAlive chains ${c.setKeepAlive(true, 1000) === c}`);
  });
  c.on("ready", () => events.push("ready"));
  c.on("data", (d: Buffer) => events.push(`client data ${d.toString()}`));
  c.on("end", () => {
    events.push("client end");
    c.end(() => events.push("client end callback"));
  });
  c.on("close", (hadError: boolean) => {
    events.push(`client close ${hadError}`);
    const t = net.connect(port, "127.0.0.1", () => {
      attempt("negative", () => t.setTimeout(-1));
      attempt("NaN", () => t.setTimeout(NaN));
      attempt("Infinity", () => t.setTimeout(Infinity));
      const never = () => events.push("removed callback ran");
      t.setTimeout(20, never);
      t.setTimeout(0, never);
      t.setTimeout(30, () => {
        events.push("timeout callback");
        t.destroy();
      });
    });
    t.on("timeout", () => events.push("timeout event"));
    t.on("close", (hadError: boolean) => {
      events.push(`t close ${hadError}`);
      server.close(() => {
        console.log(serverEvents.join("\n"));
        console.log(events.join("\n"));
      });
    });
  });
});
