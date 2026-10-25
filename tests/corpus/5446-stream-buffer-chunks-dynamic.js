// What a stream hands untyped code for string, Buffer and Uint8Array
// chunks: Buffers everywhere, including the concatenation read(n) returns
// and what read() returns after unshift() of a string.
import { PassThrough, Readable, Transform, Writable } from "node:stream";

const show = (where, c) => console.log(where, Buffer.isBuffer(c), c instanceof Uint8Array, String(c));

const w = new Writable({
  write(c, enc, cb) {
    show("write", c);
    cb();
  },
});
w.write("ab");
w.write(Buffer.from("cd"));
w.write(new Uint8Array([101, 102]));
w.end();

const r = new Readable({ read() {} });
r.on("data", (c) => show("data", c));
r.push("gh");
r.push(new Uint8Array([105, 106]));
r.push(null);

const t = new Transform({
  transform(c, enc, cb) {
    show("transform-in", c);
    cb(null, String(c).toUpperCase());
  },
});
t.on("data", (c) => show("transform-out", c));
t.write("kl");
t.end();

const p = new PassThrough();
p.on("data", (c) => show("passthrough", c));
p.write("mn");
p.end();

const rr = new Readable({ read() {} });
rr.push("op");
rr.push("qr");
rr.push(null);
rr.once("readable", () => {
  const c = rr.read(3);
  show("read(3)", c);
  rr.unshift("z");
  show("after-unshift", rr.read());
});
