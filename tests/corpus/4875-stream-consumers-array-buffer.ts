// stream/consumers.arrayBuffer — the accumulated bytes as a fresh
// ArrayBuffer: pooled small Buffer chunks and a lone chunk never alias
// the result, string chunks contribute their utf8 bytes, an empty stream
// answers a zero-length buffer, and the result works with every view.
// Settlement lands after 'close' and before a later macrotask, and the
// rejection set matches the other consumers: the stream's error and
// ERR_STREAM_PREMATURE_CLOSE.
import { Readable } from "node:stream";
import { arrayBuffer } from "node:stream/consumers";

function source(...chunks: (Buffer | string)[]): Readable {
  const r = new Readable({ read() {} });
  for (const c of chunks) r.push(c);
  r.push(null);
  return r;
}

async function main(): Promise<void> {
  const ab = await arrayBuffer(source(Buffer.from("hi"), Buffer.from([0xff, 0])));
  console.log(ab);
  console.log(ab.byteLength, ab instanceof ArrayBuffer);
  const u8 = new Uint8Array(ab);
  console.log(Array.from(u8), u8.length);
  const dv = new DataView(ab);
  console.log(dv.getUint16(0), dv.getUint8(2));
  console.log(Array.from(new Uint8Array(ab.slice(1, 3))));
  console.log(Buffer.from(ab).toString("hex"));

  // A single chunk still copies: writes through the result's view do not
  // reach the source chunk.
  const chunk = Buffer.from([1, 2, 3, 4]);
  const lone = await arrayBuffer(source(chunk));
  new Uint8Array(lone)[0] = 9;
  console.log(chunk[0], new Uint8Array(lone)[0], lone.byteLength);

  // String chunks (setEncoding) contribute their utf8 bytes.
  const encoded = new Readable({ read() {} });
  encoded.setEncoding("utf8");
  encoded.push("é");
  encoded.push("x");
  encoded.push(null);
  console.log(Array.from(new Uint8Array(await arrayBuffer(encoded))));

  const empty = await arrayBuffer(source());
  console.log(empty, empty.byteLength);

  // Timing: after 'close', before a setImmediate queued at end.
  const timed = new Readable({ read() {} });
  const order: string[] = [];
  timed.on("close", () => order.push("close"));
  const settled = arrayBuffer(timed).then((b) => order.push(`arrayBuffer(${b.byteLength})`));
  timed.push("abc");
  timed.push(null);
  setImmediate(() => order.push("immediate"));
  await settled;
  await new Promise<void>((resolve) => setImmediate(resolve));
  console.log(order.join(","));

  const failing = new Readable({ read() {} });
  const p1 = arrayBuffer(failing);
  failing.push("x");
  failing.destroy(new Error("mid-stream failure"));
  try {
    await p1;
    console.log("SHOULD NOT PRINT");
  } catch (e) {
    if (e instanceof Error) console.log("error:", e.message);
  }

  const closed = new Readable({ read() {} });
  const p2 = arrayBuffer(closed);
  closed.destroy();
  try {
    await p2;
    console.log("SHOULD NOT PRINT");
  } catch (e) {
    console.log("premature:", (e as NodeJS.ErrnoException).code);
  }
}

void main();
