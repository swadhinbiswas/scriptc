// LifetimeRegion (@scriptc/experimental): ProgramLifetime instances own
// ordinary objects of every shape (records, unions, closures and the
// bindings they capture, unknown values, arrays, maps, sets, typed arrays,
// ordinary class instances) and those objects refer back into the region.
// Each generation builds a program in a new region and releases the
// previous one; in scriptc a released region is freed once nothing outside
// it refers to its objects, and Node.js collects the same objects as
// garbage. The output is the same either way.
import type { ProgramLifetime } from "@scriptc/types";
import { LifetimeRegion } from "@scriptc/experimental";

class Sym implements ProgramLifetime {
  readonly name: string;
  readonly decls: Decl[] = [];
  readonly members = new Map<string, Sym>();
  resolved: (() => Decl | undefined) | undefined = undefined;
  constructor(name: string) {
    this.name = name;
  }
}

type Span = { start: number; end: number; owner: Decl };
type Init = { kind: "num"; value: number } | { kind: "ref"; target: Sym } | { kind: "none" };

abstract class Decl implements ProgramLifetime {
  parent: Decl | undefined = undefined;
  span: Span | undefined = undefined;
  readonly sym: Sym;
  constructor(sym: Sym) {
    this.sym = sym;
    sym.decls.push(this);
  }
  abstract describe(): string;
}

class VarDecl extends Decl {
  init: Init = { kind: "none" };
  tag: string | Decl | undefined = undefined;
  readonly notes = new Map<string, unknown>();
  describe(): string {
    const init = this.init;
    const text = init.kind === "num" ? `${init.value}` : init.kind === "ref" ? init.target.name : "-";
    return `var ${this.sym.name} = ${text}`;
  }
}

class FuncDecl extends Decl {
  readonly params: VarDecl[] = [];
  readonly body: Decl[][] = [];
  readonly weights = new Float64Array(4);
  readonly calls = new Set<FuncDecl>();
  describe(): string {
    return `function ${this.sym.name}(${this.params.map((p) => p.sym.name).join(", ")})`;
  }
}

// Ordinary (reference-counted) objects the program builds around them.
class Scope {
  readonly parent: Scope | undefined;
  readonly children: Scope[] = [];
  readonly symbols = new Map<string, Sym>();
  readonly order: Sym[] = [];
  constructor(parent: Scope | undefined) {
    this.parent = parent;
    parent?.children.push(this);
  }
  declare(sym: Sym): void {
    this.symbols.set(sym.name, sym);
    this.order.push(sym);
  }
  lookup(name: string): Sym | undefined {
    for (let s: Scope | undefined = this; s !== undefined; s = s.parent) {
      const found = s.symbols.get(name);
      if (found !== undefined) return found;
    }
    return undefined;
  }
}

class Program implements ProgramLifetime {
  readonly funcs: FuncDecl[] = [];
  readonly globals = new Scope(undefined);
  readonly index = new Map<string, Decl[]>();
  readonly pairs: [Sym, Decl][] = [];
  readonly lookups: ((name: string) => Sym | undefined)[] = [];
  readonly extra = new Map<string, unknown>();
}

function build(gen: number, funcCount: number): Program {
  const program = new Program();
  for (let f = 0; f < funcCount; f++) {
    const sym = new Sym(`f${f}`);
    const fn = new FuncDecl(sym);
    program.globals.declare(sym);
    const scope = new Scope(program.globals);
    program.lookups.push((name) => scope.lookup(name));
    for (let p = 0; p < 3; p++) {
      const ps = new Sym(`p${p}`);
      const param = new VarDecl(ps);
      param.parent = fn;
      param.span = { start: p * 10, end: p * 10 + 5, owner: param };
      param.init = p === 0 ? { kind: "num", value: gen + f } : { kind: "ref", target: sym };
      param.tag = p === 1 ? fn : `tag${p}`;
      param.notes.set("note", p === 2 ? { decl: param, list: [fn, param], depth: p } : p);
      sym.members.set(ps.name, ps);
      scope.declare(ps);
      fn.params.push(param);
      program.pairs.push([ps, param]);
    }
    fn.body.push(fn.params.slice(0, 2), [fn]);
    fn.weights[f % 4] = f + gen / 10;
    sym.resolved = () => fn.params[0];
    const listed = program.index.get(sym.name);
    if (listed === undefined) program.index.set(sym.name, [fn]);
    else listed.push(fn);
    program.funcs.push(fn);
  }
  for (const fn of program.funcs) {
    const callee = program.funcs[(program.funcs.indexOf(fn) + 1) % program.funcs.length]!;
    fn.calls.add(callee);
  }
  program.extra.set("first", [program.funcs[0], { first: program.funcs[0]!.params[0] }]);
  return program;
}

function summarize(program: Program): string {
  let checksum = 0;
  let text = "";
  for (const fn of program.funcs) {
    for (const w of fn.weights) checksum += w;
    for (const param of fn.params) {
      checksum += param.span!.end - param.span!.start;
      const init = param.init;
      if (init.kind === "num") checksum += init.value;
      if (typeof param.tag !== "string" && param.tag !== undefined) checksum += param.tag.sym.decls.length;
    }
    checksum += fn.sym.resolved?.() === fn.params[0] ? 1 : 0;
    for (const callee of fn.calls) checksum += callee.params.length;
    checksum += fn.body.flat().length;
  }
  for (const lookup of program.lookups) checksum += lookup("p1") !== undefined ? 1 : 0;
  for (const [sym, decl] of program.pairs) checksum += sym.decls.indexOf(decl) + 1;
  text += program.funcs[0]!.describe() + "; " + program.funcs[0]!.params[0]!.describe();
  return `${text}; checksum ${checksum}; index ${program.index.size}`;
}

let previous: LifetimeRegion | undefined;
for (let gen = 0; gen < 6; gen++) {
  const region = new LifetimeRegion();
  const program = region.run(() => build(gen, 5 + gen));
  console.log(`gen ${gen}: ${summarize(program)}`);
  previous?.release();
  previous = region;
}
previous?.release();
console.log("done");
