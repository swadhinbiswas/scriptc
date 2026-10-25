// node:console Console write errors. With ignoreErrors (the default) a
// failing _write and a write after end are swallowed: the stream errors
// and destroys, and the program keeps running. A user 'error' listener
// still observes the error and the temporary noop listener is gone after
// the call. With ignoreErrors: false the write is a plain stream.write, so
// the error reaches the stream's own listener.
import { Console } from "node:console";
import { Writable } from "node:stream";

function collector(label: string, fail = false): { stream: Writable; chunks: string[] } {
  const chunks: string[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _enc, cb) {
      chunks.push(chunk.toString());
      if (fail) cb(new Error(`${label} failed`));
      else cb();
    },
  });
  return { stream, chunks };
}

function tick(): Promise<void> {
  return new Promise<void>((resolve) => setImmediate(resolve));
}

async function main(): Promise<void> {
  const failing = collector("failing", true);
  const quiet = new Console(failing.stream);
  quiet.log("first");
  await tick();
  quiet.log("second");
  await tick();
  console.log("after failures:", JSON.stringify(failing.chunks), failing.stream.destroyed);
  console.log("noop listeners left:", failing.stream.listenerCount("error"));

  const ended = collector("ended");
  ended.stream.end();
  const afterEnd = new Console(ended.stream, ended.stream, true);
  afterEnd.log("ignored");
  afterEnd.error("ignored too");
  await tick();
  console.log("after end:", JSON.stringify(ended.chunks), ended.stream.destroyed);

  const observed = collector("observed", true);
  observed.stream.on("error", (e) => console.log("listener saw:", e.message));
  new Console(observed.stream).log("x");
  await tick();
  console.log("listeners:", observed.stream.listenerCount("error"));

  const strict = collector("strict");
  strict.stream.end();
  strict.stream.on("error", (e) => console.log("strict:", (e as NodeJS.ErrnoException).code));
  new Console({ stdout: strict.stream, ignoreErrors: false }).log("late");
  await tick();

  const positional = collector("positional", true);
  positional.stream.on("error", (e) => console.log("positional strict:", e.message));
  new Console(positional.stream, positional.stream, false).warn("w");
  await tick();
  console.log("done");
}

void main();
