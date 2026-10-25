import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";
import { publish } from "@scriptc/threads";
import type { ProgramLifetime } from "@scriptc/types";
import { LifetimeRegion } from "@scriptc/experimental";

// LifetimeRegion (@scriptc/experimental) with @scriptc/threads: a region
// whose objects were published is never freed in scriptc, because other
// threads may hold them without counting; its release() only marks it.
// Every worker has regions of its own, which it frees like the main thread
// does. Receivers publish() what they receive and read only fields, so
// Node.js prints the same.

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
  parent: Decl | undefined = undefined;
  constructor(pos: number, sym: Sym) {
    this.pos = pos;
    this.sym = sym;
    sym.decls.push(this);
  }
}

class Unit {
  readonly label: string;
  readonly syms: Sym[] = [];
  readonly byName = new Map<string, Sym>();
  constructor(label: string) {
    this.label = label;
  }
}

function build(label: string, n: number): Unit {
  const unit = new Unit(label);
  let parent: Decl | undefined;
  for (let i = 0; i < n; i++) {
    const sym = new Sym(`${label}${i}`);
    const decl = new Decl(i * 3, sym);
    decl.parent = parent;
    parent = decl;
    unit.syms.push(sym);
    unit.byName.set(sym.name, sym);
  }
  return unit;
}

function describe(u: Unit): string {
  const last = u.syms[u.syms.length - 1]!.decls[0]!;
  let depth = 0;
  for (let d: Decl | undefined = last; d !== undefined; d = d.parent) depth++;
  return `${u.label}: ${u.syms.map((s) => s.name).join(",")} depth ${depth} names ${u.byName.size}`;
}

if (isMainThread) {
  const shared = new LifetimeRegion();
  const program = publish(shared.run(() => build("p", 4)));
  // Unpublished objects of a region next to it are freed as usual.
  const scratch = new LifetimeRegion();
  console.log("scratch", describe(scratch.run(() => build("s", 3))));
  scratch.release();
  const worker = new Worker(new URL(import.meta.url), { workerData: { program } });
  worker.on("message", (message: unknown) => {
    const reply = message as { lines: string[] };
    for (const line of reply.lines) console.log(line);
  });
  worker.on("exit", (code: number) => {
    // Published: release() cannot free it, and the objects stay usable.
    shared.release();
    console.log("exit", code, describe(program));
    const after = new LifetimeRegion();
    console.log("after", describe(after.run(() => build("a", 2))));
    after.release();
  });
} else {
  const data = workerData as { program: Unit };
  const program = publish(data.program);
  const lines = [`worker sees ${describe(program)}`];
  for (let round = 0; round < 3; round++) {
    const own = new LifetimeRegion();
    const unit = own.run(() => build(`w${round}-`, 3 + round));
    unit.syms[0]!.decls[0]!.parent = program.syms[0]!.decls[0]!;
    lines.push(`round ${round} ${describe(unit)}`);
    own.release();
  }
  parentPort!.postMessage({ lines });
}
