// A watch-mode build loop over LifetimeRegion (@scriptc/experimental): every build parses
// and binds a program in a new region, checks it, and releases the previous build's region.
// A cache keeps one symbol of each of the last two builds, so a released region stays
// referenced until two builds later.
import type { ProgramLifetime } from "@scriptc/types";
import { LifetimeRegion } from "@scriptc/experimental";

class Sym implements ProgramLifetime {
  readonly name: string;
  readonly decls: Decl[] = [];
  flags = 0;
  constructor(name: string) {
    this.name = name;
  }
}

class Decl implements ProgramLifetime {
  readonly pos: number;
  readonly sym: Sym;
  parent: Decl | undefined = undefined;
  readonly children: Decl[] = [];
  readonly refs: string[] = [];
  constructor(pos: number, sym: Sym) {
    this.pos = pos;
    this.sym = sym;
    sym.decls.push(this);
  }
}

class Program implements ProgramLifetime {
  readonly files: Decl[][] = [];
  readonly globals = new Map<string, Sym>();
}

function bind(program: Program, file: number, decls: number, gen: number): void {
  const roots: Decl[] = [];
  for (let i = 0; i < decls; i++) {
    const name = `f${file}_d${(i * 7 + gen) % decls}`;
    let sym = program.globals.get(name);
    if (sym === undefined) {
      sym = new Sym(name);
      program.globals.set(name, sym);
    }
    const root = new Decl(i, sym);
    for (let k = 0; k < 3; k++) {
      const member = new Decl(i * 3 + k, sym);
      member.parent = root;
      member.refs.push(`f${(file + k) % 8}_d${(i + k) % decls}`);
      root.children.push(member);
    }
    roots.push(root);
  }
  program.files.push(roots);
}

function check(program: Program): number[] {
  let resolved = 0;
  let unresolved = 0;
  let depth = 0;
  for (const roots of program.files)
    for (const root of roots)
      for (const member of root.children) {
        for (const ref of member.refs) {
          if (program.globals.has(ref)) resolved++;
          else unresolved++;
        }
        for (let p: Decl | undefined = member; p !== undefined; p = p.parent) depth++;
        member.sym.flags++;
      }
  return [resolved, unresolved, depth, program.globals.size];
}

const scale = Number(process.argv[2] ?? "1");
const builds = Math.round(8 * scale);
const cache = new Map<string, Sym>();
const totals = [0, 0, 0, 0];
let previous: LifetimeRegion | undefined;
for (let gen = 0; gen < builds; gen++) {
  const region = new LifetimeRegion();
  const counts = region.run(() => {
    const program = new Program();
    for (let file = 0; file < 8; file++) bind(program, file, 4000, gen);
    const result = check(program);
    previous?.release();
    cache.set(`build${gen % 2}`, program.files[0]![0]!.sym);
    return result;
  });
  for (let k = 0; k < counts.length; k++) totals[k] = totals[k]! + counts[k]!;
  previous = region;
}
previous?.release();
let names = 0;
for (const sym of cache.values()) names += sym.name.length;
console.log("builds", builds, "totals", totals.join(","), "cached", cache.size, names);
