// pipeline() pumps a generator stage into a highWaterMark: 1 sink: each
// write waits for drain, timed against microtasks and ticks.
import { Readable, Writable } from "node:stream";
import { pipeline } from "node:stream/promises";

const log: string[] = [];
let hop = 0;
const chain = (): void => {
  if (hop++ < 40) {
    log.push(`h${hop}`);
    Promise.resolve().then(chain);
  }
};
let tick = 0;
const ticks = (): void => {
  if (tick++ < 10) {
    log.push(`t${tick}`);
    process.nextTick(ticks);
  }
};
const sink = new Writable({
  highWaterMark: 1,
  write(c: Buffer, _e, cb) {
    log.push(`write ${c.toString()} ${sink.writableLength}`);
    Promise.resolve().then(() => cb());
  },
});
sink.on("drain", () => log.push("drain"));
Promise.resolve().then(chain);
process.nextTick(ticks);
await pipeline(
  Readable.from(["1", "2", "3", "4"]),
  async function* (source: AsyncIterable<string>) {
    for await (const c of source) {
      log.push(`stage ${c}`);
      yield c + c;
    }
  },
  sink,
);
log.push("done");
console.log(log.join(" "));
