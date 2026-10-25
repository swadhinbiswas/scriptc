import { PassThrough, pipeline, Transform, Writable } from "node:stream";

const a = new PassThrough();
const b = new PassThrough();
b.resume();
b.on("close", () => {
  console.log("b close");
  process.nextTick(() => console.log("tick after b close"));
  queueMicrotask(() => console.log("micro after b close"));
});
pipeline(a, b, (err?: Error | null) => console.log("cb", err ? err.message : "ok"));
a.end("x");

const c = new PassThrough();
const d = new PassThrough();
d.on("close", () => {
  console.log("d close");
  process.nextTick(() => console.log("tick after d close"));
});
c.on("close", () => {
  console.log("c close");
  process.nextTick(() => console.log("tick after c close"));
});
pipeline(c, d, (err?: Error | null) => console.log("cb2", err ? err.message : "ok"));
d.destroy(new Error("bad"));

// a synchronous write error reaches 'error' one tick later

let k = 0;
const note = (s: string) => console.log(k++, s);
const src = new PassThrough();
const failing = new Transform({
  transform(chunk: Buffer, _enc, cb) {
    note("transform " + chunk.toString());
    cb(new Error("boom"));
  },
});
failing.on("error", (err: Error) => note("failing error " + err.message));
src.on("resume", () => note("src resume"));
src.pipe(failing);
src.write("q");
note("after write");
let u = 0;
const step = () => {
  if (u++ < 3) {
    note("step " + u);
    process.nextTick(step);
  }
};
process.nextTick(step);

// 'finish' waits for a pending _final callback, even when end() runs again
const slowFinal = new Writable({
  write(_c, _e, cb) {
    cb();
  },
  final(cb) {
    console.log("final called");
    setTimeout(() => {
      console.log("final done");
      cb();
    }, 5);
  },
});
slowFinal.on("finish", () => console.log("slow final finish"));
slowFinal.write("a");
slowFinal.end();
setTimeout(() => {
  slowFinal.end();
  console.log("second end");
}, 1);
