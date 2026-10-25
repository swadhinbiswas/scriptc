// Subclass instances where the standard types are expected: a target
// passed as `EventTarget` keeps its identity through the engine, its
// listeners leave with an AbortSignal (options.signal) or through
// events.addAbortListener, and an Event subclass dispatches on plain
// targets.
import { addAbortListener } from "node:events";

class Door extends EventTarget {
  opened = 0;
}

class Knock extends Event {
  readonly times: number;
  constructor(times: number) {
    super("knock");
    this.times = times;
  }
}

function listen(target: EventTarget, signal: AbortSignal, log: string[]): void {
  target.addEventListener(
    "knock",
    (event: Event) => {
      log.push(`${(event as Knock).times}:${event.target === target}:${target instanceof Door}`);
    },
    { signal },
  );
}

const door = new Door();
const controller = new AbortController();
const log: string[] = [];
listen(door, controller.signal, log);
door.dispatchEvent(new Knock(1));
door.dispatchEvent(new Knock(2));
controller.abort();
door.dispatchEvent(new Knock(3));
console.log(log.join(" "));

// A signal that has already aborted adds nothing.
listen(door, AbortSignal.abort(), log);
door.dispatchEvent(new Knock(4));
console.log(log.length);

// addAbortListener on a signal, with a subclass target in the listener.
const later = new AbortController();
const disposable = addAbortListener(later.signal, () => {
  door.opened++;
  door.dispatchEvent(new Knock(5));
});
listen(door, new AbortController().signal, log);
later.abort();
console.log(door.opened, log.join(" "));
disposable[Symbol.dispose]();

// Subclass events on a plain target.
const plain = new EventTarget();
plain.addEventListener("knock", (event: Event) => {
  console.log("plain", event instanceof Knock, (event as Knock).times, event.target === plain);
});
plain.dispatchEvent(new Knock(6));
