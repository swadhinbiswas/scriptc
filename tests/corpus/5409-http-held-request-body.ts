// Server requests start paused: body bytes wait for a consumer, so a 'data'
// listener attached after a timer still receives the whole body before
// 'end'. A request the handler never reads ends once the response
// finishes, on keep-alive connections too.
import { createServer, request } from "node:http";

const server = createServer((req, res) => {
  const tag = `${req.method} ${req.url}`;
  req.on("end", () => console.log("req end", tag));
  req.on("close", () => console.log("req close", tag));
  res.on("finish", () => console.log("res finish", tag));
  res.on("close", () => console.log("res close", tag));
  if (req.url === "/delayed") {
    setTimeout(() => {
      let body = "";
      req.on("data", (chunk: Buffer) => {
        body += chunk.toString();
      });
      req.on("end", () => res.end(`got ${body}`));
    }, 30);
    return;
  }
  res.end("ok");
});

const cases: [string, string, string][] = [
  ["GET", "/", ""],
  ["POST", "/", "body"],
  ["POST", "/delayed", "held body"],
  ["GET", "/keep", ""],
  ["POST", "/keep", "body"],
];

server.listen(0, "127.0.0.1", async () => {
  const { port } = server.address() as { port: number };
  for (const [method, path, body] of cases) {
    await new Promise<void>((resolve) => {
      const headers: Record<string, string> = path === "/keep" ? {} : { connection: "close" };
      const req = request({ host: "127.0.0.1", port, method, path, headers: headers }, (res) => {
        let text = "";
        res.on("data", (chunk: Buffer) => {
          text += chunk.toString();
        });
        res.on("end", () => {
          console.log("client", method, path, res.statusCode, text);
          resolve();
        });
      });
      if (body) req.end(body);
      else req.end();
    });
    await new Promise<void>((resolve) => setTimeout(resolve, 30));
    console.log("--");
  }
  server.close();
  server.closeAllConnections();
});
