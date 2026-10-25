// pipeline() function ends: a destination that rejects, a source that
// throws (its signal aborts with an AbortError first), the callback's order
// against microtasks and a tick, a stream source with a { signal } stage,
// and a destination that resolves to undefined.
import { pipeline } from "node:stream";
import { pipeline as pipelineP } from "node:stream/promises";

const log: string[] = [];
let n = 0;
const chain = (): void => {
  if (n < 30) {
    n++;
    log.push(`m${n}`);
    queueMicrotask(chain);
  }
};
function flush(label: string): void {
  console.log(label, log.join(" "));
  log.length = 0;
  n = 0;
}

async function main(): Promise<void> {
  // a destination that rejects
  try {
    await pipelineP(
      async function* () {
        yield "a";
      },
      async function (source: AsyncIterable<string>) {
        for await (const c of source) log.push(`got ${c}`);
        throw new Error("dest failed");
      },
    );
  } catch (err) {
    log.push(`caught ${(err as Error).message}`);
  }
  flush("dest rejects");
  // a source that throws, with the stage's signal observed
  try {
    await pipelineP(
      async function* ({ signal }: { signal: AbortSignal }) {
        signal.addEventListener("abort", () => log.push(`source abort ${(signal.reason as Error).name}`));
        yield "x";
        throw new Error("source failed");
      },
      async function (source: AsyncIterable<string>) {
        for await (const c of source) log.push(`dest ${c}`);
        return "unreached";
      },
    );
  } catch (err) {
    log.push(`caught ${(err as Error).message}`);
  }
  flush("source throws");
  // the callback form's order against microtasks and ticks
  await new Promise<void>((resolve) => {
    queueMicrotask(chain);
    process.nextTick(() => log.push("tick"));
    pipeline(
      async function* () {
        yield "p";
        yield "q";
      },
      async function (source: AsyncIterable<string>) {
        let s = "";
        for await (const c of source) {
          log.push(`chunk ${c}`);
          s += c;
        }
        return s;
      },
      (err?: Error | null, value?: string) => {
        log.push(`callback ${err ? err.message : null} ${value}`);
        resolve();
      },
    );
  });
  flush("timing");
  // a stream source, a stage with { signal }, and a promise destination
  const r = await pipelineP(
    (await import("node:stream")).Readable.from(["1", "2", "3"]),
    async function* (source: AsyncIterable<string>, { signal }: { signal: AbortSignal }) {
      for await (const c of source) yield `${c}:${signal.aborted}`;
    },
    async function (source: AsyncIterable<string>) {
      const parts: string[] = [];
      for await (const c of source) parts.push(c);
      return parts.join(",");
    },
  );
  console.log("stream source", r);
  // a destination that returns nothing
  const none = await pipelineP(
    async function* () {
      yield "z";
    },
    async function (source: AsyncIterable<string>) {
      for await (const c of source) log.push(c);
    },
  );
  console.log("void destination", none, log.join(","));
}
void main();
