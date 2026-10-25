// EventTarget, Event and CustomEvent from typed code: listeners typed
// `(event: Event) => void` or `{ handleEvent }` records, the dispatch
// result, the event's target and phase during and after dispatch, the
// instanceof tests, the phase constants, and CustomEvent's detail.
const bus = new EventTarget();
const seen: string[] = [];

function onPing(event: Event): void {
  seen.push(`${event.type}:${event.eventPhase}:${event.target === bus}:${event.currentTarget === bus}`);
}

bus.addEventListener("ping", onPing);
bus.addEventListener("ping", onPing, { once: true });
const ping = new Event("ping", { cancelable: true });
console.log(bus.dispatchEvent(ping), ping.eventPhase, ping.currentTarget === null, ping.target === bus);
console.log(seen.join(" "));

// Options dictionaries held in typed bindings.
const onceOptions: AddEventListenerOptions = { once: true };
for (let i = 0; i < 3; i++) {
  bus.addEventListener("round", () => seen.push(`round listener ${i}`), onceOptions);
  bus.dispatchEvent(new Event("round"));
}
const captureOptions = { capture: true };
const captured = (): void => {
  seen.push("captured");
};
bus.addEventListener("cap", captured, captureOptions);
bus.removeEventListener("cap", captured);
bus.dispatchEvent(new Event("cap"));
bus.removeEventListener("cap", captured, captureOptions);
bus.dispatchEvent(new Event("cap"));
console.log(seen.splice(0).join(" "));

const canceller = (event: Event): void => {
  event.preventDefault();
};
bus.addEventListener("save", canceller);
const save = new Event("save", { cancelable: true });
console.log("save", bus.dispatchEvent(save), save.defaultPrevented, save.returnValue);
bus.removeEventListener("save", canceller);
console.log("save again", bus.dispatchEvent(new Event("save", { cancelable: true })));

interface Payload {
  id: number;
  tags: string[];
}
const data = new CustomEvent<Payload>("data", { detail: { id: 7, tags: ["a", "b"] } });
bus.addEventListener("data", (event: Event) => {
  if (event instanceof CustomEvent) {
    const payload = event.detail as Payload;
    console.log("detail", payload.id, payload.tags.join("+"), event.detail === data.detail);
  }
});
bus.dispatchEvent(data);

const counter = {
  hits: 0,
  handleEvent(event: Event): void {
    this.hits = this.hits + 1;
    console.log("handleEvent", event.type, this.hits);
  },
};
bus.addEventListener("count", counter);
bus.dispatchEvent(new Event("count"));
bus.dispatchEvent(new Event("count"));
console.log("hits", counter.hits);

console.log(ping instanceof Event, data instanceof CustomEvent, ping instanceof CustomEvent);
console.log(bus instanceof EventTarget, Event.NONE, Event.AT_TARGET, Event.BUBBLING_PHASE);
console.log(ping.bubbles, ping.composed, ping.isTrusted, typeof ping.timeStamp);

function relay(source: EventTarget, type: string): Promise<string> {
  return new Promise((resolve) => {
    source.addEventListener(type, (event: Event) => resolve(event.type), { once: true });
  });
}
relay(bus, "later").then((type) => console.log("relayed", type));
setTimeout(() => bus.dispatchEvent(new Event("later")), 1);
