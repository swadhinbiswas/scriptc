import { compose, PassThrough, Readable, Transform, Writable } from "node:stream";

const upper = new Transform({
  transform(chunk: Buffer, _enc, cb) {
    cb(null, chunk.toString().toUpperCase());
  },
});
const exclaim = new Transform({
  transform(chunk: Buffer, _enc, cb) {
    cb(null, chunk.toString() + "!");
  },
});
const d = compose(upper, exclaim);
console.log("duplex", d.readable, d.writable, d.readableObjectMode);
d.on("data", (c: Buffer) => console.log("data", c.toString()));
d.on("finish", () => console.log("finish"));
d.on("end", () => console.log("end"));
d.on("close", () => console.log("close"));
d.write("a");
d.write("b");
d.end("c");

const p = new PassThrough();
console.log("single", compose(p) === p);

try {
  compose();
} catch (err) {
  console.log((err as Error).name, (err as NodeJS.ErrnoException).code, (err as Error).message);
}

// A readable head: the composed stream is read-only.
const src = Readable.from(["x", "y"]);
const pt = new PassThrough();
const r = compose(src, pt);
console.log("read-only", r.readable, r.writable);
r.on("data", (c: Buffer) => console.log("r data", c.toString()));
r.on("end", () => console.log("r end"));
r.on("close", () => console.log("r close"));

// A writable tail: the composed stream is write-only.
const seen: string[] = [];
const sink = new Writable({
  write(chunk: Buffer, _enc, cb) {
    seen.push(chunk.toString());
    cb();
  },
});
const w = compose(new PassThrough(), sink);
console.log("write-only", w.readable, w.writable);
w.on("finish", () => console.log("w finish", seen.join(",")));
w.on("close", () => console.log("w close"));
w.end("z");

// Errors: a failing stage destroys the composed stream.
const bad = new Transform({
  transform(_chunk: Buffer, _enc, cb) {
    cb(new Error("boom"));
  },
});
const e = compose(new PassThrough(), bad);
e.on("error", (err: Error) => console.log("e error", err.message));
e.on("close", () => console.log("e close"));
e.write("q");

// destroy() before the pipeline ends: AbortError.
const k = compose(new PassThrough(), new PassThrough());
k.on("error", (err: Error) => console.log("k error", err.name, (err as NodeJS.ErrnoException).code));
k.on("close", () => console.log("k close"));
k.destroy();

process.nextTick(() => console.log("tick"));
