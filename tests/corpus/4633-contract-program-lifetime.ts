// ProgramLifetime contract types (@scriptc/types): instances of these
// hierarchies are never freed in scriptc, so they take no reference counts
// and the cycle collector never walks them. Node sees ordinary classes: the
// annotation is erased. Everything else (the mortal scopes, arrays, maps and
// closures around them) is still reference counted and collected.
import type { Acyclic, ProgramLifetime } from "@scriptc/types";

abstract class SyntaxNode implements ProgramLifetime {
  parent: SyntaxNode | undefined = undefined;
  readonly pos: number;
  constructor(pos: number) {
    this.pos = pos;
  }
  abstract describe(): string;
  depth(): number {
    let d = 0;
    for (let p = this.parent; p !== undefined; p = p.parent) d++;
    return d;
  }
}

class Name extends SyntaxNode {
  readonly text: string;
  symbol: Sym | undefined = undefined;
  constructor(pos: number, text: string) {
    super(pos);
    this.text = text;
  }
  describe(): string {
    return `Name(${this.text})`;
  }
}

class Call extends SyntaxNode {
  readonly callee: Name;
  readonly args: SyntaxNode[] = [];
  constructor(pos: number, callee: Name) {
    super(pos);
    this.callee = callee;
    callee.parent = this;
  }
  add(arg: SyntaxNode): void {
    arg.parent = this;
    this.args.push(arg);
  }
  describe(): string {
    return `Call(${this.callee.describe()}, [${this.args.map((a) => a.describe()).join(", ")}])`;
  }
}

class Sym implements ProgramLifetime {
  readonly name: string;
  readonly declarations: SyntaxNode[] = [];
  links: Links | undefined = undefined;
  constructor(name: string) {
    this.name = name;
  }
}

class Links implements ProgramLifetime {
  resolved: Sym | undefined = undefined;
  uses = 0;
}

class Checked implements ProgramLifetime {
  readonly label: string;
  constructor(label: string) {
    if (label === "") throw new Error("empty label");
    this.label = label;
  }
}

// A mortal structure: scopes form cycles (parent <-> children) that only the
// collector can free, and they hold program-lifetime symbols.
class Scope {
  parent: Scope | undefined;
  children: Scope[] = [];
  symbols = new Map<string, Sym>();
  constructor(parent: Scope | undefined) {
    this.parent = parent;
    parent?.children.push(this);
  }
  lookup(name: string): Sym | undefined {
    for (let s: Scope | undefined = this; s !== undefined; s = s.parent) {
      const found = s.symbols.get(name);
      if (found !== undefined) return found;
    }
    return undefined;
  }
}

const globals = new Map<string, Sym>();
function declare(scope: Scope, node: Name): Sym {
  let sym = scope.symbols.get(node.text);
  if (sym === undefined) {
    sym = new Sym(node.text);
    scope.symbols.set(node.text, sym);
    globals.set(`${node.pos}:${node.text}`, sym);
  }
  sym.declarations.push(node);
  node.symbol = sym;
  return sym;
}

function parse(source: string): Call {
  const words = source.split(" ");
  const call = new Call(0, new Name(0, words[0]!));
  let pos = words[0]!.length + 1;
  for (const w of words.slice(1)) {
    call.add(new Name(pos, w));
    pos += w.length + 1;
  }
  return call;
}

const trees: Call[] = [];
const seen = new WeakMap<SyntaxNode, number>();
let total = 0;
for (let round = 0; round < 3; round++) {
  const root = new Scope(undefined);
  const inner = new Scope(root);
  const tree = parse(`f${round} a b c${round}`);
  declare(root, tree.callee);
  for (const arg of tree.args) declare(arg === tree.args[0] ? root : inner, arg as Name);
  for (const arg of tree.args) {
    const sym = inner.lookup((arg as Name).text)!;
    sym.links ??= new Links();
    sym.links.resolved = sym;
    sym.links.uses++;
    seen.set(arg, (seen.get(arg) ?? 0) + 1);
  }
  // Discarded program-lifetime instances: never observable as freed.
  for (let i = 0; i < 100; i++) new Name(i, `tmp${i}`).describe();
  trees.push(tree);
  total += tree.args.length;
  // The scopes (a mortal cycle) become garbage here.
}

const describeAll = (): string => trees.map((t) => t.describe()).join(" | ");
console.log(describeAll());
console.log(total, trees.length, globals.size);
for (const t of trees) {
  const deepest = t.args[t.args.length - 1]!;
  console.log(deepest.describe(), deepest.depth(), deepest.parent === t, seen.get(deepest));
}
const a = [...globals.values()].filter((s) => s.name === "a");
console.log(a.length, a.map((s) => s.declarations.length).join(","));
const linked = [...globals.values()].filter((s) => s.links !== undefined);
console.log(linked.map((s) => `${s.name}:${s.links!.uses}:${s.links!.resolved === s}`).join(" "));

// Values move through unions, arrays and closures like any other object.
const mixed: (SyntaxNode | Sym | string)[] = [trees[0]!, globals.get("0:f0")!, "text"];
for (const m of mixed) {
  if (typeof m === "string") console.log("string", m);
  else if (m instanceof SyntaxNode) console.log("node", m.describe());
  else console.log("symbol", m.name, m.declarations[0]!.describe());
}
const counts: number[] = [];
for (const t of trees) {
  const count = (): number => t.args.length + t.callee.text.length;
  counts.push(count());
}
console.log(counts.join(","));

// Reassigning fields after construction drops the previous value as usual.
const reparent = trees[1]!.args[0]!;
reparent.parent = trees[2];
console.log(reparent.depth(), reparent.parent === trees[2]);

try {
  new Checked("");
} catch (e) {
  console.log("caught", (e as Error).message);
}
console.log(new Checked("ok").label);

// A class can be both: Acyclic is still checked against the fields as
// written, and the instances are never freed.
class Interned implements Acyclic, ProgramLifetime {
  readonly text: string;
  readonly next: Interned | null;
  constructor(text: string, next: Interned | null) {
    this.text = text;
    this.next = next;
  }
}
let interned: Interned | null = null;
for (const word of ["alpha", "beta", "gamma"]) interned = new Interned(word, interned);
const words: string[] = [];
for (let w = interned; w !== null; w = w.next) words.push(w.text);
console.log(words.join(" "));
