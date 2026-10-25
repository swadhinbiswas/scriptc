// @exit: 1
// A listener's exception on an EventTarget subclass surfaces as an
// uncaught exception from a nextTick once the dispatching code finishes,
// and the dispatch itself goes on to the next listener.
class Alarm extends EventTarget {
  rang = 0;
}

const alarm = new Alarm();
alarm.addEventListener("ring", () => {
  throw new Error("listener failed");
});
alarm.addEventListener("ring", function (this: Alarm) {
  this.rang++;
  console.log("second listener ran", this.rang);
});
console.log("dispatch", alarm.dispatchEvent(new Event("ring")));
console.log("after dispatch", alarm.rang);
