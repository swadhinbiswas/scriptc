// Hierarchies over the runtime bases: targets and events several levels
// down keep their own class through dispatch (listener `this`, the
// event's target, the received event), super.dispatchEvent reaches the
// inherited method, and Node's inspector names the concrete class.
class Ping extends Event {
  readonly level: number;

  constructor(level: number) {
    super("ping");
    this.level = level;
  }
}

class LoudPing extends Ping {
  readonly volume = 11;
}

class Station extends EventTarget {
  readonly log: string[] = [];

  announce(level: number): void {
    this.dispatchEvent(level > 5 ? new LoudPing(level) : new Ping(level));
  }
}

class Relay extends Station {
  forwarded = 0;

  override announce(level: number): void {
    this.forwarded++;
    super.dispatchEvent(new Ping(level + 1));
    super.announce(level);
  }
}

function record(this: Station, event: Event): void {
  const kind = event instanceof LoudPing ? "loud" : event instanceof Ping ? "ping" : "other";
  const level = event instanceof Ping ? event.level : -1;
  this.log.push(`${this instanceof Relay ? "relay" : "station"}:${kind}:${level}:${event.target === this}`);
}

const relay = new Relay();
const stations: Station[] = [new Station(), relay];
for (const station of stations) {
  station.addEventListener("ping", record);
  station.announce(3);
  station.announce(8);
  console.log(station.log.join(" "));
}
console.log("forwarded", relay.forwarded, relay instanceof Station, relay instanceof EventTarget);

const loud = new LoudPing(9);
console.log(loud instanceof Ping, loud instanceof Event, loud.level, loud.volume, loud.type);
console.log(stations[0], relay);
