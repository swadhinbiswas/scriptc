// pipeline() generator stages: two chained stages, the promise form with a
// slow sink, a stage that throws, a destination that fails (the stage is
// returned and its finally runs), and a source that errors.
import { PassThrough, Readable, Writable, pipeline } from "node:stream";
import { pipeline as pipelineP } from "node:stream/promises";

const log: string[] = [];
let hop = 0;
const chain = (): void => {
  if (hop++ < 60) {
    log.push(`h${hop}`);
    Promise.resolve().then(chain);
  }
};
const collect = (label: string, hwm = 16384): Writable =>
  new Writable({
    highWaterMark: hwm,
    write(c: Buffer, _e, cb) {
      log.push(`${label} write ${c.toString()}`);
      if (hwm === 1) setTimeout(cb, 1);
      else cb();
    },
  });

Promise.resolve().then(chain);
// two chained stages
await new Promise<void>((resolve) =>
  pipeline(
    Readable.from(["a", "b", "c"]),
    async function* (source: AsyncIterable<string>) {
      for await (const c of source) yield c + "1";
    },
    async function* (source: AsyncIterable<string>) {
      for await (const c of source) {
        log.push(`second ${c}`);
        yield c + "2";
      }
    },
    collect("chained"),
    (err?: Error | null) => {
      log.push(`chained done ${err ? err.message : "ok"}`);
      resolve();
    },
  ),
);
// the promise form, with backpressure into a slow sink
await pipelineP(
  Readable.from(["x", "y", "z"]),
  async function* (source: AsyncIterable<string>) {
    for await (const c of source) yield c.repeat(3);
  },
  collect("slow", 1),
);
log.push("promise form done");
// a stage that throws
await new Promise<void>((resolve) =>
  pipeline(
    Readable.from(["p", "q"]),
    async function* (source: AsyncIterable<string>) {
      try {
        for await (const c of source) {
          if (c === "q") throw new Error("stage failed");
          yield c;
        }
      } finally {
        log.push("thrower finally");
      }
    },
    collect("thrower"),
    (err?: Error | null) => {
      log.push(`thrower done ${err ? err.message : "ok"}`);
      resolve();
    },
  ),
);
// a destination that fails: the stage's generator is returned
const failing = new Writable({
  write(_c: Buffer, _e, cb) {
    cb(new Error("sink failed"));
  },
});
await new Promise<void>((resolve) =>
  pipeline(
    Readable.from(["u", "v", "w"]),
    async function* (source: AsyncIterable<string>) {
      try {
        for await (const c of source) yield c;
      } finally {
        log.push("returned stage finally");
      }
    },
    failing,
    (err?: Error | null) => {
      log.push(`sink done ${err ? err.message : "ok"}`);
      resolve();
    },
  ),
);
// a source that errors
const bad = new Readable({
  read() {
    this.destroy(new Error("source failed"));
  },
});
await new Promise<void>((resolve) =>
  pipeline(
    bad,
    async function* (source: AsyncIterable<Buffer>) {
      for await (const c of source) yield c;
    },
    new PassThrough(),
    (err?: Error | null) => {
      log.push(`source done ${err ? err.message : "ok"}`);
      resolve();
    },
  ),
);
console.log(log.join("\n"));
