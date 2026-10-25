// LifetimeRegion (@scriptc/experimental): ordinary objects owned by a
// region's objects often form cycles of their own (scopes with parent and
// child links, closures capturing the objects that hold them, maps whose
// values point back at their owner). scriptc's cycle collector frees those
// together with the region. A dead cycle outside the region that still
// refers into it is collected first, so it does not keep the region either.
// Node.js prints the same.
import type { ProgramLifetime } from "@scriptc/types";
import { LifetimeRegion } from "@scriptc/experimental";

class Sym implements ProgramLifetime {
  readonly name: string;
  scope: Scope | undefined = undefined;
  constructor(name: string) {
    this.name = name;
  }
}

class Scope {
  readonly parent: Scope | undefined;
  readonly children: Scope[] = [];
  readonly symbols = new Map<string, Sym>();
  readonly owners = new Map<string, Scope>();
  onLookup: ((name: string) => Sym | undefined) | undefined = undefined;
  constructor(parent: Scope | undefined) {
    this.parent = parent;
    parent?.children.push(this);
  }
  declare(name: string): Sym {
    const sym = new Sym(name);
    sym.scope = this;
    this.symbols.set(name, sym);
    this.owners.set(name, this);
    return sym;
  }
  lookup(name: string): Sym | undefined {
    return this.symbols.get(name) ?? this.parent?.lookup(name);
  }
}

class Module implements ProgramLifetime {
  readonly root = new Scope(undefined);
  readonly exported: Sym[] = [];
}

function build(gen: number): Module {
  const mod = new Module();
  for (let f = 0; f < 4; f++) {
    const fn = new Scope(mod.root);
    const block = new Scope(fn);
    mod.exported.push(mod.root.declare(`g${gen}_${f}`));
    fn.declare(`p${f}`);
    block.declare(`t${f}`);
    // A closure stored in the scope that it captures.
    block.onLookup = (name) => block.lookup(name);
  }
  return mod;
}

let previous: LifetimeRegion | undefined;
let outsideCycle: { self: unknown; sym: Sym } | undefined;
for (let gen = 0; gen < 5; gen++) {
  const region = new LifetimeRegion();
  const mod = region.run(() => build(gen));
  const block = mod.root.children[1]!.children[0]!;
  const found = block.onLookup!(`g${gen}_2`);
  console.log(`gen ${gen}: ${mod.exported.map((s) => s.name).join(",")} found ${found?.name} via ${found?.scope === mod.root}`);
  // A cycle of ordinary objects outside the region that refers into it;
  // it becomes garbage at the next generation.
  const cycle: { self: unknown; sym: Sym } = { self: undefined, sym: mod.exported[0]! };
  cycle.self = cycle;
  outsideCycle = cycle;
  previous?.release();
  previous = region;
}
outsideCycle = undefined;
previous?.release();
console.log("done", outsideCycle === undefined);
