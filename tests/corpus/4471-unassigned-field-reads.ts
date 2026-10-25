// Fields observed before the constructor assigns them read as undefined.
class Gauge {
  level: number;
  constructor(level: number) {
    this.level = level;
  }
}

class Panel {
  gauge: Gauge;
  ready: boolean;
  constructor() {
    this.ready = Panel.inspectPanel(this);
    this.gauge = new Gauge(3);
  }
  static inspectPanel(panel: Panel): boolean {
    const g = panel.gauge as Gauge | undefined;
    console.log("panel gauge present:", g !== undefined, typeof panel.gauge);
    return panel.gauge === undefined;
  }
}
const panel = new Panel();
console.log(panel.ready, panel.gauge.level);

// A base constructor calls an override that reads a subclass field.
class Widget {
  name: string;
  constructor(name: string) {
    this.name = name;
    this.describe();
  }
  describe(): void {
    console.log("widget", this.name);
  }
}
class Slider extends Widget {
  track: Gauge;
  constructor() {
    super("slider");
    this.track = new Gauge(7);
    this.describe();
  }
  override describe(): void {
    if (this.track) console.log("slider track", this.track.level);
    else console.log("slider track missing", this.track === undefined, this.track == null);
    try {
      console.log(this.track.level);
    } catch (e) {
      console.log("caught", (e as Error).message);
    }
  }
}
const slider = new Slider();
console.log(slider.track.level);

// A callback registered during construction runs before the assignment.
type Listener = (source: Station) => void;
class Station {
  beacon: Gauge;
  constructor(listener: Listener) {
    listener(this);
    this.beacon = new Gauge(11);
    listener(this);
  }
}
new Station((s) => console.log("beacon", s.beacon?.level, s.beacon ? "set" : "unset"));

// Initializers run in declaration order, before the constructor body.
class Ledger {
  first = this.peek("first");
  entry: Gauge = new Gauge(5);
  later = this.peek("later");
  peek(label: string): number {
    const e: Gauge | undefined = this.entry;
    console.log(label, e === undefined ? "no entry" : e.level);
    return e === undefined ? -1 : e.level;
  }
}
const ledger = new Ledger();
console.log(ledger.first, ledger.later, ledger.entry.level);

// Writes through an unassigned field throw after evaluating the value.
class Relay {
  target: Gauge;
  constructor() {
    try {
      Relay.poke(this);
    } catch (e) {
      console.log("write", (e as Error).message);
    }
    this.target = new Gauge(1);
    Relay.poke(this);
    console.log("level", this.target.level);
  }
  static poke(r: Relay): void {
    r.target.level = (console.log("value evaluated"), 9);
  }
}
new Relay();

// Printing an unassigned field.
class Frame {
  inner: Gauge;
  constructor() {
    console.log(Frame.show(this));
    this.inner = new Gauge(2);
    console.log(Frame.show(this));
  }
  static show(f: Frame): string {
    const value: Gauge | undefined = f.inner;
    return value === undefined ? "inner: undefined" : `inner: ${value.level}`;
  }
}
new Frame();

// Ordinary classes assign before exposing the instance.
class Plain {
  a: Gauge;
  b: Gauge;
  constructor() {
    this.a = new Gauge(1);
    this.b = new Gauge(this.a.level + 1);
    this.report();
  }
  report(): void {
    console.log("plain", this.a.level, this.b.level);
  }
}
new Plain();

// Private helpers that only assign fields keep them proven; a helper that
// hands the instance out does not.
class Engine {
  private left!: Gauge;
  private right!: Gauge;
  late: Gauge;
  constructor() {
    this.setup();
    this.late = Engine.peekLate(this);
    console.log("engine", this.left.level, this.right.level, this.late.level);
  }
  private setup(): void {
    this.left = new Gauge(4);
    this.right = new Gauge(this.left.level + 1);
  }
  static peekLate(e: Engine): Gauge {
    console.log("late before", (e.late as Gauge | undefined) === undefined);
    return new Gauge(9);
  }
}
new Engine();

class Tracker {
  #target: Gauge;
  constructor() {
    this.#announce();
    this.#target = new Gauge(6);
  }
  #announce(): void {
    Tracker.seen.push(this);
  }
  level(): number | string {
    const t: Gauge | undefined = this.#target;
    return t === undefined ? "unset" : t.level;
  }
  static seen: Tracker[] = [];
}
const tracker = new Tracker();
console.log("tracker", tracker.level(), Tracker.seen.length);

// Member updates through an unassigned field throw Node's TypeErrors in
// Node's order: the value first for plain writes, the read for updates.
class Pair {
  x = 1;
  y = 2;
  sum(): number {
    return this.x + this.y;
  }
}
class Updates {
  v: Pair;
  w: Pair;
  constructor() {
    Updates.poke(this);
    this.v = new Pair();
    this.w = new Pair();
    Updates.poke(this);
  }
  static poke(b: Updates): void {
    try { b.v.x = -b.w.y; } catch (e) { console.log("1", (e as Error).message); }
    try { b.v.x += 3; } catch (e) { console.log("2", (e as Error).message); }
    try { b.v.y = 7; } catch (e) { console.log("3", (e as Error).message); }
    try { b.v.y = b.v.x * 2; } catch (e) { console.log("4", (e as Error).message); }
    try { b.v.x++; } catch (e) { console.log("5", (e as Error).message); }
    try { console.log(b.v.sum()); } catch (e) { console.log("6", (e as Error).message); }
    console.log("state", b.v?.x, b.v?.y);
  }
}
new Updates();
