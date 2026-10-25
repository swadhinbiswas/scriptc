// Array elements reached through a parameter's fields and passed to calls:
// a function that never removes a reference edge (here using `??` and Math)
// may pass them without taking ownership, while a function whose callees
// clear or replace the array must keep each element alive for the call.
// Results and lifetimes must match Node.

class Decl {
  pos: number;
  file: string;
  constructor(pos: number, file: string) {
    this.pos = pos;
    this.file = file;
  }
}

class Sym {
  name: string;
  declarations: Decl[];
  id = 0;
  constructor(name: string, declarations: Decl[]) {
    this.name = name;
    this.declarations = declarations;
  }
}

let nextId = 0;
const fileOrder = new Map<string, number>([
  ["a.ts", 1],
  ["b.ts", 2],
]);

function idOf(s: Sym): number {
  if (s.id === 0) s.id = ++nextId;
  return s.id;
}

function compareCodes(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const d = a.charCodeAt(i) - b.charCodeAt(i);
    if (d !== 0) return d;
  }
  return a.length - b.length;
}

function compareDecls(d1: Decl | undefined, d2: Decl | undefined): number {
  if (d1 === d2) return 0;
  if (d1 === undefined) return 1;
  if (d2 === undefined) return -1;
  if (d1.file !== d2.file) return (fileOrder.get(d1.file) ?? 0) - (fileOrder.get(d2.file) ?? 0);
  return d1.pos - d2.pos;
}

// Edge-preserving: field-chain element reads may be borrowed for the call.
function compareSyms(s1: Sym, s2: Sym): number {
  if (s1.declarations.length !== 0 && s2.declarations.length !== 0) {
    const r = compareDecls(s1.declarations[0]!, s2.declarations[0]!);
    if (r !== 0) return r;
  }
  const r = compareCodes(s1.name, s2.name);
  return r !== 0 ? r : idOf(s1) - idOf(s2);
}

const syms = [
  new Sym("beta", [new Decl(5, "b.ts")]),
  new Sym("alpha", [new Decl(9, "a.ts"), new Decl(1, "b.ts")]),
  new Sym("gamma", []),
  new Sym("alpha", [new Decl(9, "a.ts")]),
  new Sym("delta", [new Decl(2, "c.ts")]),
  new Sym("eps", [new Decl(2, "c.ts")]),
];
const sorted = [...syms].sort(compareSyms);
console.log("sorted", sorted.map((s) => `${s.name}#${s.id}`).join(" "));

// Not edge-preserving: the callee clears the array that holds its
// argument, so the element must survive through its own reference.
const registry: Sym[] = [];
function describeAfterClear(owner: Sym, d: Decl): string {
  owner.declarations.length = 0;
  owner.declarations = [];
  return `${d.file}:${d.pos}`;
}
function describeFirst(owner: Sym): string {
  return describeAfterClear(owner, owner.declarations[0]!);
}
const lone = new Sym("lone", [new Decl(42, "z.ts")]);
registry.push(lone);
console.log("cleared", describeFirst(lone), lone.declarations.length);

// A callee that replaces the field reached from a nested parameter chain.
class Holder {
  sym: Sym;
  constructor(sym: Sym) {
    this.sym = sym;
  }
}
function swapAndRead(h: Holder, d: Decl): number {
  h.sym = new Sym("other", []);
  return d.pos * 2;
}
function readThroughHolder(h: Holder): number {
  return swapAndRead(h, h.sym.declarations[0]!);
}
const holder = new Holder(new Sym("held", [new Decl(21, "h.ts")]));
console.log("swapped", readThroughHolder(holder), holder.sym.name);

// Many borrowed calls in a loop keep counts stable.
let total = 0;
for (let i = 0; i < 2000; i++) total += compareSyms(syms[i % syms.length]!, syms[(i * 7) % syms.length]!);
console.log("total", total, nextId);
