// util.promisify(stream.finished) and util.promisify(stream.pipeline) are
// Node's custom promisified forms, stream/promises' finished and pipeline:
// fulfilled when the stream (or the last stage) closes cleanly, rejected
// with the stream's error or ERR_STREAM_PREMATURE_CLOSE. The named imports
// and the namespace members are both recognized.
import * as stream from "node:stream";
import { PassThrough, Readable, Transform, Writable, finished } from "node:stream";
import { promisify } from "node:util";

const finishedAsync = promisify(finished);
const pipelineAsync = promisify(stream.pipeline);

function source(items: string[]): Readable {
  let i = 0;
  return new Readable({
    read() {
      this.push(i < items.length ? items[i++]! : null);
    },
  });
}

async function main(): Promise<void> {
  const clean = source(["a", "b"]);
  const cleanDone = finishedAsync(clean);
  clean.resume();
  await cleanDone;
  console.log("finished: clean");

  const torn = new Readable({ read() {} });
  const tornDone = finishedAsync(torn);
  torn.destroy(new Error("torn"));
  try {
    await tornDone;
    console.log("SHOULD NOT PRINT");
  } catch (e) {
    if (e instanceof Error) console.log("finished: rejected", e.message);
  }

  const early = new Readable({ read() {} });
  const earlyDone = finishedAsync(early);
  early.destroy();
  try {
    await earlyDone;
    console.log("SHOULD NOT PRINT");
  } catch (e) {
    if (e instanceof Error) console.log("finished: premature", (e as NodeJS.ErrnoException).code);
  }

  const out: string[] = [];
  const sink = new Writable({
    write(chunk: Buffer, _enc: string, cb: () => void) {
      out.push(chunk.toString());
      cb();
    },
  });
  await pipelineAsync(source(["x", "y", "z"]), new PassThrough(), sink);
  console.log("pipeline:", out.join(","));

  const failing = new Transform({
    transform(_chunk: Buffer, _enc: string, cb: (err?: Error | null) => void) {
      cb(new Error("boom"));
    },
  });
  const drain = new Writable({
    write(_c: Buffer, _e: string, cb: () => void) {
      cb();
    },
  });
  try {
    await pipelineAsync(source(["q"]), failing, drain);
    console.log("SHOULD NOT PRINT");
  } catch (e) {
    if (e instanceof Error) console.log("pipeline: rejected", e.message, drain.destroyed);
  }
}
main();
