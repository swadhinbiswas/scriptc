// The zlib stream members: flush() emits everything written so far (a
// Z_SYNC_FLUSH prefix decodes on its own), flush(kind) range-checks its
// kind and flush() after end() waits for 'end', params() flushes and switches
// the level for later data, close(callback) destroys and reports through
// finished(), reset() restarts a decoder mid-stream, and bytesWritten
// counts input.
import * as zlib from "node:zlib";

const deflate = zlib.createDeflate();
const parts: Buffer[] = [];
deflate.on("data", (chunk: Buffer) => parts.push(chunk));

function decodePrefix(label: string, next: () => void): void {
  const inflate = zlib.createInflate({ finishFlush: zlib.constants.Z_SYNC_FLUSH });
  const text: string[] = [];
  inflate.on("data", (chunk: Buffer) => text.push(chunk.toString()));
  inflate.on("end", () => {
    console.log(label, JSON.stringify(text.join("")));
    next();
  });
  inflate.end(Buffer.concat(parts));
}

deflate.write("hello ");
deflate.flush(() => {
  console.log("flushed", deflate.bytesWritten);
  decodePrefix("prefix", () => {
    deflate.write("world");
    deflate.flush(zlib.constants.Z_SYNC_FLUSH, () => {
      decodePrefix("prefix 2", () => {
        try {
          deflate.flush(9);
        } catch (error) {
          console.log("bad kind", (error as Error).message);
        }
        deflate.params(9, zlib.constants.Z_DEFAULT_STRATEGY, () => {
          console.log("params done", deflate.bytesWritten);
          deflate.end(" again".repeat(50));
          deflate.flush(() => {
            const all = zlib.inflateSync(Buffer.concat(parts)).toString();
            console.log("after end", all === "hello world" + " again".repeat(50), deflate.writableFinished);
            closing();
          });
        });
      });
    });
  });
});

function closing(): void {
  const gzip = zlib.createGzip();
  gzip.on("close", () => console.log("close event", gzip.destroyed));
  gzip.close(() => console.log("close callback"));
  console.log("closed sync", gzip.destroyed);
  resetting();
}

function resetting(): void {
  // A stored (level 0) stream decodes the same under every zlib build, so
  // half of it yields a known prefix before reset() starts over.
  const first = zlib.deflateSync("first stream text ".repeat(4), { level: 0 });
  const inflate = zlib.createInflate();
  const out: string[] = [];
  inflate.on("data", (chunk: Buffer) => out.push(chunk.toString()));
  const second = zlib.deflateSync("after reset");
  inflate.on("end", () =>
    console.log("reset", JSON.stringify(out.join("")), inflate.bytesWritten === 40 + second.length),
  );
  inflate.write(first.subarray(0, 40), () => {
    inflate.reset();
    inflate.end(second);
  });
}
