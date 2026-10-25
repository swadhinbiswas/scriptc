// LifetimeRegion (@scriptc/experimental) released while things outside it
// still refer into it: a symbol of the region, and the region's name map,
// held by an ordinary array. The region is kept, and its objects stay
// usable. SCRIPTC_REGION_DEBUG=1 reports what keeps it on stderr
// (tests/harness/lifetime-regions.test.ts); Node.js prints the same stdout.
import type { ProgramLifetime } from "@scriptc/types";
import { LifetimeRegion } from "@scriptc/experimental";

class Sym implements ProgramLifetime {
  readonly name: string;
  readonly decls: Decl[] = [];
  constructor(name: string) {
    this.name = name;
  }
}

class Decl implements ProgramLifetime {
  readonly pos: number;
  readonly sym: Sym;
  constructor(pos: number, sym: Sym) {
    this.pos = pos;
    this.sym = sym;
    sym.decls.push(this);
  }
}

class Unit implements ProgramLifetime {
  readonly syms: Sym[] = [];
  readonly byName = new Map<string, Sym>();
}

function build(n: number): Unit {
  const unit = new Unit();
  for (let i = 0; i < n; i++) {
    const sym = new Sym(`s${i}`);
    new Decl(i * 2, sym);
    new Decl(i * 2 + 1, sym);
    unit.syms.push(sym);
    unit.byName.set(sym.name, sym);
  }
  return unit;
}

const region = new LifetimeRegion();
const held: Sym[] = [];
const maps: Map<string, Sym>[] = [];
region.run(() => {
  const unit = build(3);
  held.push(unit.syms[1]!);
  maps.push(unit.byName);
});
region.release();
function describe(): string {
  const sym = held[0]!;
  return `${sym.name} ${sym.decls.length} ${sym.decls[1]!.pos} ${maps[0]!.size} ${[...maps[0]!.keys()].join(",")}`;
}
console.log(describe());
held.length = 0;
maps.length = 0;
const next = new LifetimeRegion();
console.log(next.run(() => build(2).syms.length));
next.release();
