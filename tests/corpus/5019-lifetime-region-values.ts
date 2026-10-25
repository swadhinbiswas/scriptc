// LifetimeRegion (@scriptc/experimental) handles are ordinary objects: they
// keep their identity, can be stored in variables, fields, arrays and maps,
// and inspect like instances of a class with no own properties. Node.js
// prints the same.
import type { ProgramLifetime } from "@scriptc/types";
import { LifetimeRegion } from "@scriptc/experimental";

class Entry implements ProgramLifetime {
  readonly key: string;
  constructor(key: string) {
    this.key = key;
  }
}

class Workspace {
  readonly regions: LifetimeRegion[] = [];
  readonly byName = new Map<string, LifetimeRegion>();
  current: LifetimeRegion | undefined = undefined;
  open(name: string): LifetimeRegion {
    const region = new LifetimeRegion();
    this.regions.push(region);
    this.byName.set(name, region);
    this.current = region;
    return region;
  }
  close(name: string): boolean {
    const region = this.byName.get(name);
    if (region === undefined) return false;
    region.release();
    this.byName.delete(name);
    if (this.current === region) this.current = undefined;
    return true;
  }
}

const ws = new Workspace();
const a = ws.open("a");
const b = ws.open("b");
console.log(typeof a, a === b, a === ws.regions[0], ws.current === b);
console.log(a);
console.log([a, b], { region: a });
console.log(Object.keys(a).length, Object.keys({ a, n: 1 }).join());
const entries = ws.regions.map((r, i) => r.run(() => new Entry(`e${i}`)));
console.log(entries.map((e) => e.key).join(","));
console.log(ws.close("a"), ws.close("a"), ws.byName.size, ws.current === b);
const pick = (r: LifetimeRegion | undefined): string => (r === undefined ? "none" : "some");
console.log(pick(ws.current), pick(undefined), pick(ws.byName.get("b")));
ws.current?.release();
console.log(ws.close("b"), ws.byName.size, entries[1]!.key);
