// The default global agent and an Agent with keepAlive or a finite
// maxSockets send Connection: keep-alive; `agent: false` and an Agent with
// neither send Connection: close.
// A request destroyed before its response fails with Node's
// "socket hang up" error, code ECONNRESET, after its 'timeout' event.
import { Agent, createServer, request } from "node:http";

const server = createServer((req, res) => {
  if (req.url === "/slow") {
    setTimeout(() => res.end("late"), 300);
    return;
  }
  res.end(String(req.headers.connection));
});

function connection(port: number, agent: Agent | false | undefined): Promise<string> {
  return new Promise<string>((resolve) => {
    const req = request({ host: "127.0.0.1", port, path: "/", agent: agent }, (res) => {
      let body = "";
      res.on("data", (chunk: Buffer) => {
        body += chunk.toString();
      });
      res.on("end", () => resolve(body));
    });
    req.end();
  });
}

server.listen(0, "127.0.0.1", async () => {
  const port = (server.address() as { port: number }).port;
  console.log("default agent", await connection(port, undefined));
  console.log("agent false", await connection(port, false));
  console.log("new Agent()", await connection(port, new Agent()));
  console.log("Agent maxSockets", await connection(port, new Agent({ maxSockets: 4 })));
  await new Promise<void>((resolve) => {
    const req = request({ host: "127.0.0.1", port, path: "/slow", timeout: 50 });
    req.on("timeout", () => {
      console.log("timeout", req.destroyed);
      req.destroy();
    });
    req.on("error", (err: NodeJS.ErrnoException) => console.log("error", err.code, err.message));
    req.on("close", () => {
      console.log("close", req.destroyed);
      resolve();
    });
    req.end();
  });
  server.close();
  server.closeAllConnections();
});
