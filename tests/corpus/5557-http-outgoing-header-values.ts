// Outgoing header values keep the type they were set with: getHeader and
// getHeaders answer numbers as numbers and arrays as arrays, appendHeader
// turns an existing value into an array, and the wire carries one line per
// array element. setHeader on an existing name keeps its position.
import * as http from "node:http";

const server = http.createServer((req, res) => {
  res.setHeader("X-One", "1");
  res.appendHeader("Set-Cookie", "a=1");
  res.appendHeader("Set-Cookie", ["b=2", "c=3"]);
  res.appendHeader("x-one", "again");
  res.setHeader("X-Num", 42);
  res.setHeader("X-List", ["p", "q"]);
  res.appendHeader("X-New", "fresh");
  console.log("names", res.getHeaderNames().join(","));
  console.log("has", res.hasHeader("x-ONE"), res.hasHeader("nope"));
  const num = res.getHeader("x-num");
  console.log("get", JSON.stringify(res.getHeader("set-cookie") ?? null), typeof num, JSON.stringify(num ?? null), JSON.stringify(res.getHeader("x-new") ?? null), JSON.stringify(res.getHeader("nope") ?? null));
  console.log("headers", JSON.stringify(res.getHeaders()));
  res.removeHeader("X-List");
  res.setHeader("X-One", "replaced");
  console.log("after", res.getHeaderNames().join(","));
  res.writeHead(201, "Made", { "X-Head": "w" });
  console.log("headersSent", res.headersSent);
  res.end("body");
});

server.listen(0, "127.0.0.1", () => {
  const port = (server.address() as { port: number }).port;
  http.get({ host: "127.0.0.1", port, path: "/" }, (res) => {
    console.log("status", res.statusCode, res.statusMessage);
    const raw: string[] = [];
    for (let i = 0; i < res.rawHeaders.length; i += 2) {
      if (res.rawHeaders[i] !== "Date") raw.push(res.rawHeaders[i]!, res.rawHeaders[i + 1]!);
    }
    console.log("raw", JSON.stringify(raw));
    console.log("cookie", JSON.stringify(res.headersDistinct["set-cookie"] ?? null));
    res.resume();
    res.on("end", () => server.close());
  });
});
