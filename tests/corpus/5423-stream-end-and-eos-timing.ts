import { PassThrough, Readable, finished } from "node:stream";

const log = (s: string) => console.log(s);
const done = new Readable({ read() {} });
done.on("end", () => log("done end"));
done.on("close", () => log("done close"));
done.resume();
done.push(null);

const half = new PassThrough();
half.on("data", (c: Buffer) => log("half data " + c.toString()));
half.on("end", () => log("half end"));
half.on("finish", () => log("half finish"));
half.on("close", () => log("half close"));
half.end("x");
half.resume();
let n = 0;
const tick = () => { if (n++ < 6) { log("tick " + n); process.nextTick(tick); } };
process.nextTick(tick);

// finished() on streams that already settled answers on a nextTick

const settled = new Readable({ read() {} });
settled.resume();
settled.push(null);
settled.on("close", () => {
  const before = settled.listenerCount("error");
  const cleanup = finished(settled, { readable: true }, (err) => console.log("closed cb", err ? err.message : "ok"));
  console.log("closed listeners", settled.listenerCount("end"), settled.listenerCount("close"), settled.listenerCount("error") - before);
  process.nextTick(() => console.log("tick after register"));
  cleanup();
  console.log("after cleanup", settled.listenerCount("error") - before);
  finished(settled, { readable: true, error: false }, (err) => console.log("closed cb2", err ? err.message : "ok"));
  console.log("error:false listeners", settled.listenerCount("error") - before);
});

const halfDone = new PassThrough();
halfDone.end("x");
halfDone.resume();
halfDone.on("end", () => {
  finished(halfDone, { writable: false }, (err) => console.log("readable-only cb", err ? err.message : "ok"));
  console.log("ended listeners", halfDone.listenerCount("end"), halfDone.listenerCount("finish"));
});

const errored = new PassThrough();
errored.on("error", () => console.log("errored error"));
errored.destroy(new Error("bad"));
errored.on("close", () => {
  finished(errored, {}, (err) => console.log("errored cb", err ? err.message : "ok"));
});

// read(0) on an object-mode stream reads nothing
const objects = Readable.from([Buffer.from("o1"), Buffer.from("o2")]);
objects.once("readable", () => {
  const none = objects.read(0);
  console.log("read(0)", none === null, objects.readableLength);
  const first = objects.read();
  console.log("read()", first === null ? "null" : first.toString(), objects.readableLength);
});
