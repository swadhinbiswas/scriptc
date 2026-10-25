// @exit: 1
// The process warnings EventTarget emits: the one-time leak warning past
// ten listeners of one type (none for AbortSignal, whose limit is 0) and
// the no-op warning for a null or undefined listener. Both arrive through
// process.emitWarning on a later tick; the 'warning' listener prints them
// (the stderr report carries the pid, so the @exit directive keeps it out
// of the comparison).
process.on("warning", (w) => console.log("warning:", w.name, "|", w.message));

const t = new EventTarget();
for (let i = 0; i < 11; i++) t.addEventListener("x", () => {});
for (let i = 0; i < 12; i++) t.addEventListener("x", () => {});
for (let i = 0; i < 11; i++) t.addEventListener("y", () => {});
t.addEventListener("z", null);
t.addEventListener("z", undefined);
const ac = new AbortController();
for (let i = 0; i < 12; i++) ac.signal.addEventListener("abort", () => {});
for (let i = 0; i < 12; i++) new EventTarget().addEventListener("w", () => {}, { signal: ac.signal });
console.log("sync end");
process.nextTick(() => console.log("tick queued after the warnings"));
setTimeout(() => {
  process.exitCode = 1;
}, 1);
