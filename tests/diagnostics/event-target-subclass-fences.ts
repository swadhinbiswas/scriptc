// EventTarget and Event subclasses inherit the runtime's members. The
// engine never calls or reads a subclass member with one of those names,
// so declaring one is refused.
class Bus extends EventTarget {
  dispatchEvent(event: Event): boolean {
    console.log("dispatching", event.type);
    return true;
  }
}

class Ping extends Event {
  readonly type = "ping";
  constructor() {
    super("ping");
  }
}

console.log(new Ping().type);
console.log(new Bus().dispatchEvent(new Event("x")));
