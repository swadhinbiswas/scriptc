// setEncoding on Readable.from streams: Buffer and Uint8Array entries
// decode through the stream's decoder whether they were buffered before
// setEncoding or pulled after it, in object and byte mode, and reach
// for-await, pipe, pipeline, an operator's output and a composed stream
// as strings.
import { PassThrough, Readable, Writable, compose, pipeline } from "node:stream";

const log: string[] = [];
const sink = (label: string): Writable =>
  new Writable({
    write(chunk: Buffer, _enc, cb) {
      log.push(`${label} wrote ${chunk.toString("hex")}`);
      cb();
    },
  });
const drain = async (label: string, r: Readable): Promise<void> => {
  for await (const c of r) log.push(`${label} got ${typeof c} ${String(c)}`);
};

// setEncoding before the first lazy read
const before = Readable.from([Buffer.from("ab"), Buffer.from("c\\u00e9")]);
before.setEncoding("utf8");
await drain("before", before);

// setEncoding after the first lazy read (byte mode: Node re-counts an
// object-mode buffer's length in characters)
const after = Readable.from([Buffer.from("xy"), Buffer.from("zw"), Buffer.from("!")], {
  objectMode: false,
});
await new Promise<void>((resolve) => {
  after.once("data", (c: Buffer) => {
    log.push(`after first ${c.toString()}`);
    after.pause();
    after.setEncoding("hex");
    after.on("data", (s: string) => log.push(`after rest ${s}`));
    after.on("end", () => resolve());
    after.resume();
  });
});

// Uint8Array entries, a split multi-byte character across entries
const split = Readable.from([new Uint8Array([0xe2, 0x82]), new Uint8Array([0xac, 0x41])]);
split.setEncoding("utf8");
await drain("split", split);

// byte mode
const bytes = Readable.from([Buffer.from("by"), Buffer.from("te")], { objectMode: false });
bytes.setEncoding("base64");
await drain("bytes", bytes);

// pipe and pipeline delivery of an encoded stream
const piped = Readable.from([Buffer.from("p1"), Buffer.from("p2")]);
piped.setEncoding("utf8");
await new Promise<void>((resolve) => piped.pipe(sink("pipe")).on("finish", () => resolve()));
const lined = Readable.from([Buffer.from("l1"), Buffer.from("l2")]);
lined.setEncoding("latin1");
await new Promise<void>((resolve) =>
  pipeline(lined, new PassThrough(), sink("pipeline"), () => resolve()),
);

// an operator's output and a composed stream, encoded
const mapped = Readable.from([Buffer.from("m")]).map((b: Buffer) => Buffer.concat([b, b]));
mapped.setEncoding("utf8");
await drain("mapped", mapped);
const composed = compose(Readable.from([Buffer.from("k1"), Buffer.from("k2")]), new PassThrough());
composed.setEncoding("utf8");
const parts: string[] = [];
composed.on("data", (c: string) => parts.push(typeof c + ":" + c));
await new Promise<void>((resolve) => composed.on("end", () => resolve()));
log.push(`composed ${parts.join("").replace(/string:/g, "")} ${parts.every((p) => p.startsWith("string:"))}`);
console.log(log.join("\n"));
