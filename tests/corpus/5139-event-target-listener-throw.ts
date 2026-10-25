// @exit: 1
// A listener's exception surfaces as an uncaught exception from a
// nextTick after the dispatching code finishes, even when nothing else
// keeps the event loop busy.
const target = new EventTarget();
target.addEventListener("ping", () => {
  console.log("listener");
  throw new Error("from the listener");
});
console.log("dispatch", target.dispatchEvent(new Event("ping")));
console.log("after dispatch");
