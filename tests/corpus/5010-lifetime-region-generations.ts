// LifetimeRegion (@scriptc/experimental) in the shape of a compiler's watch
// mode: every file is parsed and bound in a region of its own, the checker
// state of each generation lives in another region and points into the
// file regions, and every generation edits one file. A replaced file's
// region is released at once; scriptc frees it only after the checker
// generation that still refers to it has been released too. Node.js runs
// the same program unchanged (run calls its callback, release does
// nothing).
import type { ProgramLifetime } from "@scriptc/types";
import { LifetimeRegion } from "@scriptc/experimental";

abstract class Node implements ProgramLifetime {
  parent: Node | undefined = undefined;
  symbol: Sym | undefined = undefined;
  readonly pos: number;
  constructor(pos: number) {
    this.pos = pos;
  }
}

class Ident extends Node {
  readonly text: string;
  constructor(pos: number, text: string) {
    super(pos);
    this.text = text;
  }
}

class Num extends Node {
  readonly value: number;
  constructor(pos: number, value: number) {
    super(pos);
    this.value = value;
  }
}

class Binary extends Node {
  readonly left: Node;
  readonly right: Node;
  readonly op: string;
  constructor(pos: number, left: Node, op: string, right: Node) {
    super(pos);
    this.left = left;
    this.right = right;
    this.op = op;
    left.parent = this;
    right.parent = this;
  }
}

class Decl extends Node {
  readonly name: Ident;
  readonly init: Node;
  constructor(pos: number, name: Ident, init: Node) {
    super(pos);
    this.name = name;
    this.init = init;
    name.parent = this;
    init.parent = this;
  }
}

class SourceFile extends Node {
  readonly fileName: string;
  readonly statements: Decl[] = [];
  readonly locals = new Map<string, Sym>();
  constructor(fileName: string) {
    super(0);
    this.fileName = fileName;
  }
}

class Sym implements ProgramLifetime {
  readonly name: string;
  readonly declarations: Node[] = [];
  constructor(name: string) {
    this.name = name;
  }
}

// Checker state: types and per-symbol links that point back into the trees.
class Type implements ProgramLifetime {
  readonly id: number;
  readonly text: string;
  readonly origin: Node | undefined;
  constructor(id: number, text: string, origin: Node | undefined) {
    this.id = id;
    this.text = text;
    this.origin = origin;
  }
}

class Links implements ProgramLifetime {
  readonly symbol: Sym;
  type: Type | undefined = undefined;
  constructor(symbol: Sym) {
    this.symbol = symbol;
  }
}

function parse(fileName: string, version: number, count: number): SourceFile {
  const file = new SourceFile(fileName);
  let pos = 1;
  for (let i = 0; i < count; i++) {
    const name = new Ident(pos++, `${fileName.slice(0, -3)}_v${i}`);
    let init: Node = new Num(pos++, i + version);
    if (i > 0) init = new Binary(pos++, init, i % 2 === 0 ? "+" : "*", new Ident(pos++, `${fileName.slice(0, -3)}_v${i - 1}`));
    const decl = new Decl(pos++, name, init);
    decl.parent = file;
    file.statements.push(decl);
  }
  return file;
}

function bind(file: SourceFile): void {
  for (const decl of file.statements) {
    const sym = new Sym(decl.name.text);
    sym.declarations.push(decl);
    decl.symbol = sym;
    decl.name.symbol = sym;
    file.locals.set(sym.name, sym);
  }
}

class Checker {
  readonly links = new Map<Sym, Links>();
  readonly literals = new Map<number, Type>();
  readonly files: SourceFile[];
  nextType = 1;
  diagnostics: string[] = [];
  constructor(files: SourceFile[]) {
    this.files = files;
  }
  literal(value: number, origin: Node): Type {
    let t = this.literals.get(value);
    if (t === undefined) {
      t = new Type(this.nextType++, `${value}`, origin);
      this.literals.set(value, t);
    }
    return t;
  }
  typeOf(node: Node, file: SourceFile): Type {
    if (node instanceof Num) return this.literal(node.value, node);
    if (node instanceof Ident) {
      const sym = file.locals.get(node.text);
      if (sym === undefined) {
        this.diagnostics.push(`${file.fileName}:${node.pos} cannot find '${node.text}'`);
        return new Type(this.nextType++, "error", node);
      }
      return this.typeOfSymbol(sym, file);
    }
    if (node instanceof Binary) {
      const l = this.typeOf(node.left, file);
      const r = this.typeOf(node.right, file);
      return new Type(this.nextType++, `(${l.text} ${node.op} ${r.text})`.slice(0, 24), node);
    }
    return new Type(this.nextType++, "unknown", node);
  }
  typeOfSymbol(sym: Sym, file: SourceFile): Type {
    let links = this.links.get(sym);
    if (links === undefined) {
      links = new Links(sym);
      this.links.set(sym, links);
    }
    if (links.type === undefined) links.type = this.typeOf((sym.declarations[0] as Decl).init, file);
    return links.type;
  }
}

const fileCount = 4;
const files: SourceFile[] = [];
const fileRegions: LifetimeRegion[] = [];
let checkerRegion: LifetimeRegion | undefined;

function parseInRegion(i: number, version: number): void {
  const region = new LifetimeRegion();
  const file = region.run(() => {
    const parsed = parse(`m${i}.ts`, version, 6 + i);
    bind(parsed);
    return parsed;
  });
  const old = fileRegions[i];
  files[i] = file;
  fileRegions[i] = region;
  old?.release();
}

for (let i = 0; i < fileCount; i++) parseInRegion(i, 0);
for (let gen = 0; gen < 8; gen++) {
  if (gen > 0) parseInRegion(gen % fileCount, gen);
  const previous = checkerRegion;
  checkerRegion = new LifetimeRegion();
  const summary = checkerRegion.run(() => {
    const checker = new Checker(files);
    const parts: string[] = [];
    for (const file of files) {
      const last = file.statements[file.statements.length - 1]!;
      parts.push(`${file.fileName}=${checker.typeOfSymbol(last.symbol!, file).text}`);
    }
    return `${parts.join(" ")} types=${checker.nextType - 1} links=${checker.links.size}`;
  });
  // The previous checker no longer matters once the new one exists.
  previous?.release();
  console.log(`gen ${gen}: ${summary}`);
}
checkerRegion?.release();
for (const region of fileRegions) region.release();
console.log(files.map((f) => `${f.fileName}:${f.statements.length}`).join(" "));
