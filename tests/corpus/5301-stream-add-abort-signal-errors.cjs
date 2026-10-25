// addAbortSignal's argument checks from CommonJS: Node's
// ERR_INVALID_ARG_TYPE messages for values that are not AbortSignals or
// streams (null fails the in-operator check), a falsy signal option is
// ignored, and the AbortError carries the abort reason as its cause.
const { addAbortSignal, Readable } = require("node:stream");
const r = new Readable({ read() {} });
for (const bad of [{}, null, 1, "x", undefined]) {
  try { addAbortSignal(bad, r); console.log("accepted", bad); } catch (e) { console.log(e.code, e.message); }
}
try { addAbortSignal(new AbortController().signal, {}); } catch (e) { console.log(e.code, e.message); }
const ac = new AbortController();
ac.abort(new Error("reason here"));
const s = new Readable({ read() {}, signal: ac.signal });
s.on("error", (e) => console.log("error", e.name, e.cause.message, e.code));
const t = new Readable({ read() {}, signal: false });
console.log("falsy signal ignored", t.destroyed);
