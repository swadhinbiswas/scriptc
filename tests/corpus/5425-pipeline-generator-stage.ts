// pipeline() with an async generator stage between two streams: the stage
// iterates the source stream itself, and its values reach the destination
// on the same microtasks as in Node.
import { Readable, Writable, pipeline } from "node:stream";

const log: string[] = [];
let k = 0;
const chain = (): void => {
  if (k++ < 40) {
    log.push(`m${k}`);
    Promise.resolve().then(chain);
  }
};
const src = Readable.from(["a", "b"]);
const sink = new Writable({
  write(c: Buffer, _e, cb) {
    log.push(`write ${c.toString()}`);
    cb();
  },
});
Promise.resolve().then(chain);
pipeline(
  src,
  async function* (source: AsyncIterable<string>) {
    for await (const c of source) {
      log.push(`stage ${c}`);
      yield c.toUpperCase();
    }
  },
  sink,
  (err?: Error | null) => {
    log.push(`done ${err ? err.message : "ok"}`);
    console.log(log.join(" "));
  },
);
