// Subclass instances through checked-dynamic values: inherited methods
// and accessors answer on the instance itself, the subclass's own fields
// and methods stay reachable, and writes to the writable accessors land
// on the event.
class Tick extends Event {
  count = 0;
  constructor(count: number) {
    super("tick", { cancelable: true });
    this.count = count;
  }
  double(): number {
    return this.count * 2;
  }
}

class Clock extends EventTarget {
  ticks = 0;
}

function wire(target: any, log: string[]): void {
  target.addEventListener("tick", function (this: any, event: any) {
    this.ticks = this.ticks + 1;
    log.push(`${event.type}:${event.count}:${event.double()}:${event.target === target}:${this === target}`);
    event.returnValue = false;
  });
}

function fire(target: any, event: any): unknown {
  return target.dispatchEvent(event);
}

const clock = new Clock();
const log: string[] = [];
wire(clock, log);
const tick = new Tick(4);
console.log(fire(clock, tick), tick.defaultPrevented, clock.ticks, log.join(" "));

const loose: any = tick;
console.log(loose.type, loose.cancelable, loose.defaultPrevented, loose.eventPhase, loose.count);
loose.cancelBubble = true;
console.log(tick.cancelBubble, typeof loose.preventDefault, typeof loose.double);
const looseClock: unknown = clock;
console.log(Object.keys(loose).join(","), JSON.stringify(loose), JSON.stringify(looseClock));
console.log(loose instanceof Tick, loose instanceof Event, looseClock instanceof EventTarget);
console.log(String(loose), `${looseClock}`);

function listen(target: any, method: string, listener: unknown): void {
  target[method]("tick", listener);
}
const other = new Clock();
const handler = {
  calls: 0,
  handleEvent(event: Tick): void {
    this.calls = this.calls + event.count;
  },
};
listen(other, "addEventListener", handler);
fire(other, new Tick(5));
fire(other, new Tick(6));
listen(other, "removeEventListener", handler);
fire(other, new Tick(7));
console.log("handler", handler.calls);
