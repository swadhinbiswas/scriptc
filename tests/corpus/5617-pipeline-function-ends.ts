// pipeline() with function stages at both ends: a source function (called
// with { signal }), a stage taking { signal }, and a destination async
// function whose value resolves the promise form and reaches the callback.
// The pipeline's own signal aborts when it finishes.
import { pipeline, Writable } from "node:stream";
import { pipeline as pipelineP } from "node:stream/promises";

function sink(label: string): Writable {
  const chunks: string[] = [];
  return new Writable({
    write(chunk: Buffer, _enc, cb) {
      chunks.push(chunk.toString());
      cb();
    },
    final(cb) {
      console.log(label, "sink", chunks.join(","));
      cb();
    },
  });
}

async function main(): Promise<void> {
  await new Promise<void>((resolve) => {
    pipeline(
      async function* () {
        yield "s1";
        yield "s2";
      },
      sink("source fn"),
      (err?: Error | null) => {
        console.log("source fn done", err ?? null);
        resolve();
      },
    );
  });
  const result = await pipelineP(
    async function* ({ signal }: { signal: AbortSignal }) {
      console.log("source signal aborted", signal.aborted);
      yield "a";
      yield "b";
    },
    async function* (source: AsyncIterable<string>) {
      for await (const c of source) yield c.toUpperCase();
    },
    async function (source: AsyncIterable<string>) {
      const out: string[] = [];
      for await (const c of source) out.push(c);
      return out.join("+");
    },
  );
  console.log("promise result", result);
  await new Promise<void>((resolve) => {
    pipeline(
      async function* () {
        yield "x";
      },
      async function (source: AsyncIterable<string>) {
        let n = 0;
        for await (const c of source) n += c.length;
        return n;
      },
      (err?: Error | null, value?: number) => {
        console.log("callback", err ?? null, value);
        resolve();
      },
    );
  });
  let aborted: () => boolean = () => false;
  await pipelineP(
    async function* () {
      yield "q";
    },
    async function* (source: AsyncIterable<string>, { signal }: { signal: AbortSignal }) {
      aborted = () => signal.aborted;
      for await (const c of source) yield c;
    },
    sink("signal"),
  );
  console.log("stage signal aborted after", aborted());
}
void main();
