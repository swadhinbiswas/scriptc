// A typed EventTarget subclass: the instance is its listeners' `this`
// and its events' target, methods dispatch through this.dispatchEvent,
// and the inherited add/remove semantics (once, capture, duplicates,
// handleEvent objects) hold on the subclass. A handleEvent listener can be
// a record, an inline literal whose arrow returns a value, or a class
// instance whose method (own or inherited) runs with the instance as
// `this`, on subclass and plain targets alike.
class Counter extends EventTarget {
  hits = 0;
  readonly label: string;

  constructor(label: string) {
    super();
    this.label = label;
  }

  bump(): boolean {
    return this.dispatchEvent(new Event("bump", { cancelable: true }));
  }
}

const counter = new Counter("main");
function onBump(this: Counter, event: Event): void {
  this.hits++;
  console.log(
    "bump",
    this.label,
    this === counter,
    event.target === counter,
    event.currentTarget === counter,
    event.eventPhase,
  );
}

counter.addEventListener("bump", onBump);
counter.addEventListener("bump", onBump); // a duplicate is ignored
counter.addEventListener("bump", onBump, { capture: true }); // a separate entry
console.log(counter.bump(), counter.hits);
counter.removeEventListener("bump", onBump, true);
console.log(counter.bump(), counter.hits);

counter.addEventListener("bump", (event: Event) => event.preventDefault(), { once: true });
console.log(counter.bump(), counter.bump(), counter.hits);

const watcher = {
  seen: 0,
  handleEvent(event: Event): void {
    this.seen = this.seen + 1;
    console.log("handleEvent", event.type, event.target === counter);
  },
};
counter.addEventListener("reset", watcher);
counter.dispatchEvent(new Event("reset"));
counter.removeEventListener("reset", watcher);
counter.dispatchEvent(new Event("reset"));
console.log("seen", watcher.seen);

let returned = 0;
counter.addEventListener("tally", { handleEvent: (event: Event) => (returned += event.type.length) });
counter.dispatchEvent(new Event("tally"));
console.log("returned", returned);

class Tracker {
  calls = 0;
  readonly name: string;
  constructor(name: string) {
    this.name = name;
  }
  handleEvent(event: Event): void {
    this.calls++;
    console.log(`${this.name} handles`, event.type, event.currentTarget instanceof Counter);
  }
}
class LoudTracker extends Tracker {
  override handleEvent(event: Event): void {
    super.handleEvent(event);
    console.log(`${this.name} is loud`, this.calls);
  }
}
class QuietTracker extends Tracker {}
const trackers: Tracker[] = [new Tracker("plain"), new LoudTracker("loud"), new QuietTracker("quiet")];
for (const tracker of trackers) counter.addEventListener("track", tracker);
counter.dispatchEvent(new Event("track"));
counter.removeEventListener("track", trackers[1]!);
counter.dispatchEvent(new Event("track"));
const plainTarget = new EventTarget();
plainTarget.addEventListener("track", trackers[0]!);
plainTarget.dispatchEvent(new Event("track"));
console.log(trackers.map((tracker) => `${tracker.name}:${tracker.calls}`).join(" "));

console.log(counter instanceof Counter, counter instanceof EventTarget);
console.log(counter);
