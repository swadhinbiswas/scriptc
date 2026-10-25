// stream.addAbortSignal and the constructors' signal option: an abort
// destroys the stream with an AbortError (no unhandled error: the
// listener eos registers handles it), an already aborted signal destroys
// it during construction, the subclass super({ signal }) form applies it
// too, and an abort after the stream finished changes nothing.
import { addAbortSignal, Readable, Writable } from "node:stream";

const ac = new AbortController();
const r = addAbortSignal(ac.signal, new Readable({ read() {} }));
r.on("close", () => console.log("close", r.destroyed, r.errored?.name));
ac.abort();
console.log("after abort", r.destroyed);
const pre = new AbortController();
pre.abort("x");
const signal = pre.signal;
const w = new Writable({ write(_c, _e, cb) { cb(); }, signal });
console.log("pre", w.destroyed, w.errored?.name);
w.on("error", (e: Error) => console.log("w error", e.name, e.message));
w.on("close", () => console.log("w close"));
const ok = new Readable({ read() { this.push("a"); this.push(null); } });
const ac2 = new AbortController();
addAbortSignal(ac2.signal, ok).resume();
ok.on("close", () => { ac2.abort(); console.log("ok close, abort after finish", ok.errored); });
class Sub extends Readable {
  constructor(s: AbortSignal) { super({ signal: s }); }
  _read() {}
}
const ac3 = new AbortController();
const sub = new Sub(ac3.signal);
sub.on("error", (e: Error) => console.log("sub error", e.name));
ac3.abort();
