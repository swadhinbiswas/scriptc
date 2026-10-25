// A socket with no 'data' listener still reads ahead: a peer that ends
// without sending data ends and closes it, a peer that sends data nobody
// reads leaves it open with the bytes counted, a listener added later gets
// the buffered bytes and then 'end', and reading stops at the 64 KiB
// high-water mark until a consumer drains the buffer.
import * as net from "node:net";

const LARGE = 1 << 20;
let mode = "";
const server = net.createServer((s) => {
  if (mode === "empty") s.end();
  else if (mode === "large") s.end(Buffer.alloc(LARGE, 97));
  else s.end("hello");
});

function round(port: number, label: string, attachAfter: number): Promise<void> {
  return new Promise<void>((resolve) => {
    mode = label;
    const c = net.connect(port, "127.0.0.1");
    let total = 0;
    c.on("end", () => console.log(label, "end", c.bytesRead, total));
    c.on("close", () => {
      console.log(label, "close");
      resolve();
    });
    setTimeout(() => {
      const read = label === "large" ? c.bytesRead >= 65536 && c.bytesRead < LARGE : c.bytesRead;
      console.log(label, "after 200ms", c.readyState, read);
      if (attachAfter === 0) {
        c.destroy();
        return;
      }
      c.on("data", (d: Buffer) => {
        if (label !== "large") console.log(label, "late data", d.toString());
        total += d.length;
      });
    }, 200);
  });
}

server.listen(0, "127.0.0.1", async () => {
  const port = (server.address() as net.AddressInfo).port;
  await round(port, "empty", 0);
  await round(port, "unread", 0);
  await round(port, "late", 1);
  await round(port, "large", 1);
  server.close();
});
