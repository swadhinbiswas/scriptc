import { Readable } from "node:stream";

const log: string[] = [];
let hop = 0;
const tick = (): void => {
  if (hop++ < 30) {
    log.push(`hop ${hop}`);
    Promise.resolve().then(tick);
  }
};

async function* agen(): AsyncGenerator<string> {
  try {
    log.push("agen start");
    yield "a1";
    await null;
    yield "a2";
    yield "a3";
  } finally {
    log.push("agen finally");
  }
}
function* sgen(): Generator<Buffer> {
  try {
    yield Buffer.from("s1");
    yield Buffer.from("s2");
  } finally {
    log.push("sgen finally");
  }
}
function* thrower(): Generator<string> {
  yield "t1";
  throw new Error("gen boom");
}
async function* catcher(): AsyncGenerator<string> {
  try {
    yield "c1";
    yield "c2";
  } catch (err) {
    log.push(`catcher caught ${(err as Error).message}`);
  } finally {
    log.push("catcher finally");
  }
}

Promise.resolve().then(tick);
for await (const c of Readable.from(agen())) {
  log.push(`got ${String(c)}`);
  if (c === "a2") break;
}
for await (const c of Readable.from(sgen())) log.push(`sync got ${String(c)}`);
const bytes = Readable.from(sgen(), { objectMode: false });
log.push(`bytes mode ${bytes.readableObjectMode} ${bytes.readableHighWaterMark}`);
bytes.on("data", (c: Buffer) => log.push(`bytes ${c.toString()}`));
await new Promise<void>((r) => bytes.on("end", r));
const t = Readable.from(thrower());
t.on("data", (c: string) => log.push(`t data ${c}`));
await new Promise<void>((r) => t.on("error", (err: Error) => { log.push(`t error ${err.message}`); r(); }));
const c = Readable.from(catcher());
const cClosed = new Promise<void>((r) => c.on("close", () => { log.push("c close"); r(); }));
c.once("data", (v: string) => {
  log.push(`c data ${v}`);
  c.destroy(new Error("stop"));
});
await new Promise<void>((r) => c.on("error", (err: Error) => { log.push(`c error ${err.message}`); r(); }));
await cClosed;
console.log(log.join("\n"));
