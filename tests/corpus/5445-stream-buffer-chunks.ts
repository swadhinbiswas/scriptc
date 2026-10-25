// Chunks a stream creates from strings are Buffers, as in Node: write()
// and push() of a string, push() with an encoding, transform output given
// as a string (callback or this.push), the concatenation read(n) returns,
// and unshift() of a string. Typed callbacks receive them as Buffer, so
// String(), template literals and + print the text.
import { PassThrough, Readable, Transform, Writable, pipeline } from "node:stream";
import { pipeline as pipelinePromise } from "node:stream/promises";

const show = (where: string, c: Buffer): void => console.log(where, String(c), `${c}`, c + "", c.length);

const w = new Writable({
  write(c: Buffer, _e, cb) {
    show("write", c);
    cb();
  },
});
w.write("ab");
w.write(Buffer.from("cd"));
w.write("é");
w.end();

const r = new Readable({ read() {} });
r.on("data", (c: Buffer) => show("push", c));
r.push("ef");
r.push(null);

const encoded = new Readable({ read() {} });
encoded.on("data", (c: Buffer) => show("push-base64", c));
encoded.push("aGk=", "base64");
encoded.push(null);

const upper = new Transform({
  transform(c: Buffer, _e, cb) {
    cb(null, String(c).toUpperCase());
  },
});
upper.on("data", (c: Buffer) => show("transform-callback", c));
upper.write("ij");
upper.end();

const exclaim = new Transform({
  transform(c: Buffer, _e, cb) {
    this.push(String(c) + "!");
    cb();
  },
});
exclaim.on("data", (c: Buffer) => show("transform-push", c));
exclaim.write("kl");
exclaim.end();

const pass = new PassThrough();
pass.on("data", (c: Buffer) => show("passthrough", c));
pass.write("mn");
pass.end();

const buffered = new Readable({ read() {} });
buffered.push("op");
buffered.push("qr");
buffered.push(null);
buffered.once("readable", () => {
  show("read(3)", buffered.read(3) as Buffer);
  buffered.unshift("z");
  show("after-unshift", buffered.read() as Buffer);
});

const collected: string[] = [];
const sink = new Writable({
  write(c: Buffer, _e, cb) {
    collected.push(String(c));
    cb();
  },
});
pipeline(Readable.from(["s", "t"]), sink, (err: NodeJS.ErrnoException | null) => {
  console.log("pipeline", err ?? null, collected.join(""));
});

const promised: string[] = [];
const promiseSink = new Writable({
  write(c: Buffer, _e, cb) {
    promised.push(`${c}`);
    cb();
  },
});
void pipelinePromise(Readable.from(["u", "v"]), promiseSink).then(() => console.log("pipeline promise", promised.join("")));
