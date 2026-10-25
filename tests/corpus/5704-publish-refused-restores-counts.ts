import { publish } from "@scriptc/threads";
import type { ProgramLifetime } from "@scriptc/types";

// publish() logs each object's count before marking it immortal, and a
// refused publish restores every logged count. The graphs here mix ordinary
// objects shared by several holders (counts above 1), program-lifetime
// instances (whose count is a large constant) and strings, and they are
// published repeatedly on one thread, refused ones in between: each graph
// must stay writable after a refusal and behave normally afterwards.

class Sym implements ProgramLifetime {
  readonly name: string;
  readonly decls: Decl[] = [];
  constructor(name: string) {
    this.name = name;
  }
}

class Decl {
  readonly sym: Sym;
  readonly pos: number;
  note: string;
  hook: (() => string) | undefined = undefined;
  constructor(sym: Sym, pos: number) {
    this.sym = sym;
    this.pos = pos;
    this.note = `d${pos}`;
    sym.decls.push(this);
  }
}

class Unit {
  readonly syms: Sym[] = [];
  readonly decls: Decl[] = [];
  readonly shared: Decl[] = [];
}

function build(n: number, round: number): Unit {
  const unit = new Unit();
  for (let i = 0; i < n; i++) {
    const sym = new Sym(`s${round}_${i}`);
    unit.syms.push(sym);
    for (let k = 0; k < 3; k++) unit.decls.push(new Decl(sym, i * 3 + k));
  }
  // Decls held by two arrays: counts of 2 and more before the publish.
  for (let i = 0; i < unit.decls.length; i += 4) unit.shared.push(unit.decls[i]!);
  return unit;
}

function attempt(what: string, run: () => void): void {
  try {
    run();
    console.log(`${what}: ok`);
  } catch (e) {
    console.log(`${what}: ${(e as Error).message}`);
  }
}

const kept: Unit[] = [];
for (let round = 0; round < 6; round++) {
  const unit = build(50 * (round + 1), round);
  const refused = round % 2 === 0;
  if (refused) unit.decls[unit.decls.length - 1]!.hook = () => "hook";
  attempt(`round ${round} publish`, () => {
    publish(unit);
  });
  attempt(`round ${round} write`, () => {
    unit.decls[1]!.note = "changed";
  });
  if (refused) {
    // Still ordinary: drop the hook and publish again.
    unit.decls[unit.decls.length - 1]!.hook = undefined;
    unit.shared.push(unit.decls[2]!);
    attempt(`round ${round} republish`, () => {
      publish(unit);
    });
    attempt(`round ${round} write after`, () => {
      unit.decls[1]!.note = "again";
    });
  }
  kept.push(unit);
  let decls = 0;
  for (const sym of unit.syms) decls += sym.decls.length;
  console.log(round, unit.syms.length, decls, unit.shared.length, unit.decls[1]!.note, unit.syms[0]!.name);
}
let total = 0;
for (const unit of kept) for (const d of unit.shared) total += d.pos + d.sym.decls.length;
console.log("total", total);
