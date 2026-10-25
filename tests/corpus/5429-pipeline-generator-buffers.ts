// pipeline() with a stage typed AsyncIterable<Buffer> between streams, more
// streams after it, and the callback form's return value.
import { PassThrough, Readable, Transform, Writable, pipeline } from "node:stream";

const log: string[] = [];
const upper = new Transform({
  transform(c: Buffer, _e, cb) {
    cb(null, c.toString().toUpperCase());
  },
});
const sink = new Writable({
  write(c: Buffer, _e, cb) {
    log.push(`sink ${c.toString()}`);
    cb();
  },
});
const source = new Readable({
  read() {
    this.push(Buffer.from("hello "));
    this.push(Buffer.from("world"));
    this.push(null);
  },
});
const ret = pipeline(
  source,
  new PassThrough(),
  async function* (chunks: AsyncIterable<Buffer>) {
    let total = 0;
    for await (const chunk of chunks) {
      total += chunk.length;
      log.push(`stage ${chunk.length} ${chunk.toString("hex")}`);
      yield chunk.subarray(0, 3);
    }
    log.push(`stage total ${total}`);
  },
  upper,
  sink,
  (err?: Error | null) => {
    log.push(`done ${err ? err.message : "ok"} ${sink.writableFinished}`);
    console.log(log.join("\n"));
  },
);
console.log("returns the destination", ret === sink);
