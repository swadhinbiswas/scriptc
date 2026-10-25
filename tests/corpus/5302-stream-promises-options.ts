// stream/promises options: pipeline(..., { signal }) destroys every stage
// with an AbortError in pipeline order and rejects after the last close
// (an already aborted signal too), and { end: false } settles when the
// source is done while the destination stays open. finished(stream,
// options): readable/writable choose which end counts, error: false
// waits for close, signal rejects without destroying the stream, and
// cleanup removes the listeners. The callback form takes the options.
import { Duplex, PassThrough, Readable, Writable, finished as finishedCb } from "node:stream";
import { finished, pipeline } from "node:stream/promises";

{
  const ac = new AbortController();
  const src = new Readable({ read() {} });
  const mid = new PassThrough();
  const dst = new Writable({ write(c, _e, cb) { console.log("write", c.toString()); cb(); } });
  src.on("error", (e: Error) => console.log("src error", e.name));
  src.on("close", () => console.log("src close"));
  mid.on("error", (e: Error) => console.log("mid error", e.name));
  mid.on("close", () => console.log("mid close"));
  dst.on("error", (e: Error) => console.log("dst error", e.name));
  dst.on("close", () => console.log("dst close"));
  const p = pipeline(src, mid, dst, { signal: ac.signal });
  src.push("a");
  setTimeout(() => ac.abort(), 5);
  try { await p; } catch (e) { console.log("rejected", (e as Error).name); }
}
{
  const ac = new AbortController();
  ac.abort();
  const src = Readable.from(["x"]);
  const dst = new Writable({ write(_c, _e, cb) { cb(); } });
  try { await pipeline(src, dst, { signal: ac.signal }); } catch (e) { console.log("pre", (e as Error).name, src.destroyed, dst.destroyed); }
}
{
  const chunks: string[] = [];
  const dst = new Writable({ write(c, _e, cb) { chunks.push(c.toString()); cb(); } });
  dst.on("finish", () => console.log("dst finish"));
  await pipeline(Readable.from(["1", "2"]), dst, { end: false });
  console.log("resolved end:false", chunks.join(""), dst.writableEnded, dst.destroyed);
  dst.end("3");
  await new Promise<void>((r) => setTimeout(r, 5));
  console.log("after manual end", chunks.join(""));
}
console.log("done");

{
  const d = new Duplex({ read() {}, write(_c, _e, cb) { cb(); } });
  d.on("finish", () => console.log("d finish"));
  d.on("close", () => console.log("d close"));
  const p = finished(d, { readable: false }).then(() => console.log("d settled (readable: false)"));
  d.end("x");
  await p;
}
{
  const d = new PassThrough();
  d.on("end", () => console.log("pt end"));
  const p = finished(d, { writable: false }).then(() => console.log("pt settled (writable: false)"));
  d.resume();
  d.end("y");
  await p;
}
{
  const r = new Readable({ read() {} });
  r.on("error", (e: Error) => console.log("r error event", e.message));
  r.on("close", () => console.log("r close"));
  const p = finished(r, { error: false }).catch((e) => console.log("r rejected", (e as Error).message));
  r.destroy(new Error("boom"));
  await p;
}
{
  const ac = new AbortController();
  const r = new Readable({ read() {} });
  const p = finished(r, { signal: ac.signal }).catch((e) => console.log("aborted", (e as Error).name, r.destroyed));
  ac.abort();
  await p;
}
{
  const r = Readable.from(["a"]);
  r.resume();
  await finished(r, { cleanup: true });
  console.log("cleanup listeners", r.listenerCount("end"), r.listenerCount("close"));
}
{
  const w = new Writable({ write(_c, _e, cb) { cb(); } });
  finishedCb(w, { writable: true }, (err?: Error | null) => console.log("callback form", err));
  w.end("z");
}
