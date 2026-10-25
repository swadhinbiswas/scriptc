// EventTarget dispatch follows Node's linked-list walk: listeners run in
// registration order with the target as `this`, a listener appended while
// a later one is still pending runs in the same dispatch, a removed
// listener is skipped, `once` listeners leave before they run, and the
// (listener, capture) pair is the identity. After the first callback the
// event no longer reports itself as dispatching (eventPhase 0, null
// currentTarget), exactly Node's kIsBeingDispatched reset.
const t = new EventTarget();

function section(name) {
  console.log("--", name);
}

section("order and this");
function first(e) {
  console.log("first", e.type, this === t, e.eventPhase, e.currentTarget === t, e.target === t);
  t.addEventListener("x", () => console.log("appended during dispatch"));
  t.removeEventListener("x", third);
}
function second(e) {
  console.log("second", e.eventPhase, e.currentTarget === null, e.composedPath().length);
}
function third() {
  console.log("third (removed before its turn)");
}
t.addEventListener("x", first);
t.addEventListener("x", second);
t.addEventListener("x", third);
t.addEventListener("x", first); // duplicate (listener, capture) is ignored
const ev = new Event("x");
console.log("result", t.dispatchEvent(ev));
console.log("after", ev.eventPhase, ev.currentTarget, ev.target === t, ev.srcElement === t);
console.log("again", t.dispatchEvent(ev));

section("tail append");
const tail = new EventTarget();
tail.addEventListener("y", () => {
  console.log("only listener appends");
  tail.addEventListener("y", () => console.log("appended after the last node"));
});
tail.dispatchEvent(new Event("y"));
tail.dispatchEvent(new Event("y"));

section("once and capture");
const o = new EventTarget();
const shared = () => console.log("shared");
o.addEventListener("o", () => console.log("once"), { once: true });
o.addEventListener("o", shared, true);
o.addEventListener("o", shared, { capture: false });
o.dispatchEvent(new Event("o"));
o.removeEventListener("o", shared, true); // a boolean options value reads no capture
o.dispatchEvent(new Event("o"));
o.removeEventListener("o", shared, { capture: true });
o.dispatchEvent(new Event("o"));

section("cancelable and passive");
const c = new EventTarget();
c.addEventListener("p", (e) => {
  e.preventDefault();
  console.log("in passive", e.defaultPrevented);
}, { passive: true });
c.addEventListener("c", (e) => {
  e.preventDefault();
  console.log("prevented", e.defaultPrevented, e.returnValue);
});
c.addEventListener("r", (e) => {
  e.returnValue = false;
});
console.log("passive result", c.dispatchEvent(new Event("p", { cancelable: true })));
const cancel = new Event("c", { cancelable: true });
console.log("cancel result", c.dispatchEvent(cancel), cancel.defaultPrevented);
console.log("not cancelable", c.dispatchEvent(new Event("c")));
const rv = new Event("r", { cancelable: true });
console.log("returnValue result", c.dispatchEvent(rv), rv.defaultPrevented);

section("stop propagation");
const s = new EventTarget();
s.addEventListener("s", (e) => {
  e.stopPropagation();
  console.log("stopPropagation keeps going", e.cancelBubble);
});
s.addEventListener("s", (e) => {
  e.stopImmediatePropagation();
  console.log("stopImmediatePropagation");
});
s.addEventListener("s", () => console.log("never"));
s.dispatchEvent(new Event("s"));
const cb = new Event("cb");
cb.cancelBubble = true;
console.log("cancelBubble", cb.cancelBubble);

section("handleEvent");
const h = new EventTarget();
const handler = {
  tag: "obj",
  handleEvent(e) {
    console.log("handleEvent", this.tag, e.type, this === handler);
  },
};
h.addEventListener("h", handler);
h.dispatchEvent(new Event("h"));
handler.handleEvent = (e) => console.log("replaced handleEvent", e.type);
h.dispatchEvent(new Event("h"));
h.addEventListener("missing", {});
h.dispatchEvent(new Event("missing"));
h.removeEventListener("h", handler);
h.dispatchEvent(new Event("h"));

section("validation");
// Values the checker would reject at these call sites.
function loose(value) {
  return value;
}
function attempt(label, fn) {
  try {
    fn();
    console.log(label, "ok");
  } catch (e) {
    console.log(label, e.name, e.code, e.message);
  }
}
// @ts-expect-error -- the missing argument is the point
attempt("new Event()", () => new Event());
attempt("bad options", () => new Event("x", loose(5)));
attempt("dispatch non-event", () => t.dispatchEvent(loose({})));
// @ts-expect-error -- the missing argument is the point
attempt("dispatch nothing", () => t.dispatchEvent());
attempt("listener number", () => t.addEventListener("x", loose(5)));
// @ts-expect-error -- the missing argument is the point
attempt("missing listener", () => t.addEventListener("x"));
attempt("options number", () => t.addEventListener("x", () => {}, loose(5)));
attempt("signal object", () => t.addEventListener("x", () => {}, { signal: loose(1) }));
const rec = new EventTarget();
rec.addEventListener("rec", (e) => {
  attempt("recursion", () => rec.dispatchEvent(e));
});
rec.dispatchEvent(new Event("rec"));

section("event fields");
const fresh = new Event("f", { bubbles: true, cancelable: true, composed: true });
console.log(fresh.type, fresh.bubbles, fresh.cancelable, fresh.composed, fresh.isTrusted);
console.log(fresh.target, fresh.currentTarget, fresh.eventPhase, fresh.timeStamp >= 0);
console.log(Event.NONE, Event.CAPTURING_PHASE, Event.AT_TARGET, Event.BUBBLING_PHASE);
console.log(String(fresh), String(t), Object.prototype.toString.call(new CustomEvent("c")));
fresh.initEvent("renamed", false, false);
console.log(fresh.type, fresh.bubbles, fresh.cancelable);
const custom = new CustomEvent("d", { detail: { n: 1 } });
console.log(custom.detail.n, new CustomEvent("e").detail, custom instanceof Event, custom instanceof CustomEvent);
console.log(fresh instanceof CustomEvent, t instanceof EventTarget, loose({}) instanceof Event);
console.log(new Event(loose(42)).type, new Event(loose(null)).type);
// util.inspect: EventTarget prints its (empty) custom view; beyond the
// depth limit both print the bare class name.
console.log([t], { deep: { deeper: { target: t, event: fresh } } });
