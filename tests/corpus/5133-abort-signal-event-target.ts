// AbortSignal is an EventTarget on the same engine: `onabort` takes the
// position of its first assignment, abort listeners and the removal hooks
// that options.signal registers run in registration order (the hooks run
// even after stopImmediatePropagation), any event type can be dispatched
// on a signal, and events.addAbortListener registers a once listener or,
// for an aborted signal, queues the call.
import { addAbortListener } from "node:events";

const log: string[] = [];

// onabort is registered where it was first assigned, even as null.
const first = new AbortController();
first.signal.onabort = null;
first.signal.addEventListener("abort", () => log.push("listener"));
first.signal.onabort = (event: Event) => log.push(`onabort ${event.type} ${event.isTrusted}`);
first.abort();
console.log(log.splice(0).join(", "));
console.log(first.signal.onabort !== null);

// options.signal: the removal hook is an abort listener of its own.
const controller = new AbortController();
const target = new EventTarget();
controller.signal.addEventListener("abort", () => {
  log.push("early abort listener dispatches");
  target.dispatchEvent(new Event("work"));
});
target.addEventListener("work", () => log.push("work listener"), { signal: controller.signal });
controller.signal.addEventListener("abort", (event: Event) => {
  log.push("stops the rest");
  event.stopImmediatePropagation();
});
controller.signal.addEventListener("abort", () => log.push("never runs"));
target.dispatchEvent(new Event("work"));
controller.abort();
target.dispatchEvent(new Event("work"));
console.log(log.splice(0).join(", "));

// An aborted signal registers nothing.
const done = new AbortController();
done.abort();
target.addEventListener("work", () => log.push("not registered"), { signal: done.signal });
target.dispatchEvent(new Event("work"));
console.log("after aborted signal:", log.splice(0).join(", ") || "none");

// Signals dispatch any event type, with their own `this` and target.
const custom = new AbortController();
custom.signal.addEventListener("custom", (event: Event) => {
  log.push(`custom ${event.type} ${event.target === custom.signal} ${event.isTrusted}`);
});
console.log(custom.signal.dispatchEvent(new Event("custom")), log.splice(0).join(", "));
custom.signal.addEventListener("abort", (event: Event) => log.push(`manual ${event.isTrusted}`));
custom.signal.dispatchEvent(new Event("abort"));
console.log(custom.signal.aborted, log.splice(0).join(", "));

// events.addAbortListener
const viaHelper = new AbortController();
const disposable = addAbortListener(viaHelper.signal, (event: Event) => {
  log.push(`helper ${event.type}`);
});
viaHelper.signal.addEventListener("abort", (event: Event) => event.stopImmediatePropagation());
viaHelper.signal.addEventListener("abort", () => log.push("stopped"));
viaHelper.abort();
console.log(log.splice(0).join(", "));
disposable[Symbol.dispose]();

const disposed = new AbortController();
const handle = addAbortListener(disposed.signal, () => log.push("disposed listener"));
handle[Symbol.dispose]();
disposed.abort();
console.log("after dispose:", log.splice(0).join(", ") || "none");

const already = new AbortController();
already.abort();
addAbortListener(already.signal, () => console.log("aborted-signal listener runs later"));
queueMicrotask(() => console.log("microtask queued after it"));
console.log("sync end");

function attempt(label: string, fn: () => void): void {
  try {
    fn();
    console.log(label, "ok");
  } catch (e) {
    const err = e as Error & { code?: string };
    console.log(label, err.name, err.code, err.message);
  }
}
attempt("not a signal", () => addAbortListener(target as unknown as AbortSignal, () => {}));
attempt("not a function", () => addAbortListener(already.signal, 5 as unknown as () => void));
