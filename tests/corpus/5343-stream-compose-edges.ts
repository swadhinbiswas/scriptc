import { compose, PassThrough, Readable, Transform, Writable } from "node:stream";

// object-mode tail: Readable.from strings through compose
const objs = compose(Readable.from(["a", "b", "c"]), new PassThrough({ objectMode: false }));
console.log("objs", objs.readableObjectMode, objs.readableHighWaterMark);
objs.on("data", (c: Buffer) => console.log("objs data", c.toString()));
objs.on("end", () => console.log("objs end"));

// an operator stream as the tail: object mode
const mapped = compose(new PassThrough(), new PassThrough()).map((c: Buffer) => c.toString() + "?");
mapped.on("data", (c: string) => console.log("mapped", c));

// backpressure: a slow sink makes the composed writable buffer
const slow = new Writable({
  highWaterMark: 2,
  write(chunk: Buffer, _enc, cb) {
    console.log("slow write", chunk.toString());
    setTimeout(cb, 1);
  },
});
const bp = compose(new PassThrough({ highWaterMark: 2 }), slow);
console.log("bp write 1", bp.write("aa"));
console.log("bp write 2", bp.write("bb"));
console.log("bp write 3", bp.write("cc"));
bp.on("drain", () => console.log("bp drain"));
bp.on("finish", () => console.log("bp finish"));
bp.end();

// a destroyed stream in the chain
const gone = new PassThrough();
gone.destroy();
try {
  compose(gone, new PassThrough());
} catch (err) {
  console.log((err as NodeJS.ErrnoException).code, (err as Error).message.slice(0, 44));
}

// upper-casing round trip with a for-await reader
const up = compose(
  new Transform({
    transform(c: Buffer, _e, cb) {
      cb(null, c.toString().toUpperCase());
    },
  }),
  new PassThrough(),
);
(async () => {
  up.end("hello");
  for await (const c of up) console.log("for await", String(c));
  console.log("done");
})();
