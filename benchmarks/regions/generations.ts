// Models a long-running compiler process: per-file syntax trees with binder
// symbols persist across generations; each generation edits one file
// (reparse + rebind) and rebuilds all checker state (types, signatures, node
// and symbol links, caches) from scratch.
//
//   gens <files> <nodesPerFile> <generations> <mode: edit|all> [plain]
//
// Each file's tree is parsed and bound in a region of its own, and each
// generation's checker state in another; a file's region is released when
// the file is replaced, the checker's when the next checker is built.
// `plain` never constructs a region: everything stays in the default region.
import { readFileSync } from "node:fs";
import type { ProgramLifetime } from "@scriptc/types";
import { LifetimeRegion } from "@scriptc/experimental";

let nextNodeId = 1;
let nextSymbolId = 1;

const K_File = 0;
const K_Func = 1;
const K_Param = 2;
const K_Var = 3;
const K_Block = 4;
const K_Ret = 5;
const K_Call = 6;
const K_Bin = 7;
const K_Ident = 8;
const K_Num = 9;
const K_Str = 10;

abstract class Node implements ProgramLifetime {
  readonly kind: number;
  readonly id: number;
  readonly pos: number;
  parent: Node | undefined = undefined;
  symbol: Sym | undefined = undefined;
  flow: Flow | undefined = undefined;
  constructor(kind: number, pos: number) {
    this.kind = kind;
    this.id = nextNodeId++;
    this.pos = pos;
  }
}

class NodeList implements ProgramLifetime {
  readonly nodes: Node[];
  constructor(nodes: Node[]) {
    this.nodes = nodes;
  }
}

class Ident extends Node {
  readonly text: string;
  constructor(pos: number, text: string) {
    super(K_Ident, pos);
    this.text = text;
  }
}
class NumLit extends Node {
  readonly value: number;
  constructor(pos: number, value: number) {
    super(K_Num, pos);
    this.value = value;
  }
}
class StrLit extends Node {
  readonly text: string;
  constructor(pos: number, text: string) {
    super(K_Str, pos);
    this.text = text;
  }
}
class Binary extends Node {
  readonly left: Node;
  readonly right: Node;
  readonly op: number;
  constructor(pos: number, left: Node, op: number, right: Node) {
    super(K_Bin, pos);
    this.left = left;
    this.right = right;
    this.op = op;
  }
}
class Call extends Node {
  readonly callee: Ident;
  readonly args: NodeList;
  constructor(pos: number, callee: Ident, args: NodeList) {
    super(K_Call, pos);
    this.callee = callee;
    this.args = args;
  }
}
class Ret extends Node {
  readonly expr: Node;
  constructor(pos: number, expr: Node) {
    super(K_Ret, pos);
    this.expr = expr;
  }
}
class VarDecl extends Node {
  readonly name: Ident;
  readonly init: Node;
  constructor(pos: number, name: Ident, init: Node) {
    super(K_Var, pos);
    this.name = name;
    this.init = init;
  }
}
class Block extends Node {
  readonly statements: NodeList;
  locals: Map<string, Sym> | undefined = undefined;
  constructor(pos: number, statements: NodeList) {
    super(K_Block, pos);
    this.statements = statements;
  }
}
class Param extends Node {
  readonly name: Ident;
  constructor(pos: number, name: Ident) {
    super(K_Param, pos);
    this.name = name;
  }
}
class Func extends Node {
  readonly name: Ident;
  readonly params: NodeList;
  readonly body: Block;
  constructor(pos: number, name: Ident, params: NodeList, body: Block) {
    super(K_Func, pos);
    this.name = name;
    this.params = params;
    this.body = body;
  }
}
class SourceFile extends Node {
  readonly fileName: string;
  readonly text: string;
  readonly statements: NodeList;
  locals: Map<string, Sym> | undefined = undefined;
  constructor(fileName: string, text: string, statements: NodeList) {
    super(K_File, 0);
    this.fileName = fileName;
    this.text = text;
    this.statements = statements;
  }
}

class Flow implements ProgramLifetime {
  readonly node: Node;
  readonly antecedent: Flow | undefined;
  constructor(node: Node, antecedent: Flow | undefined) {
    this.node = node;
    this.antecedent = antecedent;
  }
}

class Sym implements ProgramLifetime {
  readonly name: string;
  readonly flags: number;
  readonly declarations: Node[] = [];
  members: Map<string, Sym> | undefined = undefined;
  parent: Sym | undefined = undefined;
  id = 0;
  constructor(name: string, flags: number) {
    this.name = name;
    this.flags = flags;
  }
}

// ---- parser: a deterministic "source text" per file and edit version ----

class Rng {
  s: number;
  constructor(seed: number) {
    this.s = seed >>> 0 || 1;
  }
  next(n: number): number {
    let x = this.s;
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    this.s = x;
    return x % n;
  }
}

class Parser {
  readonly rng: Rng;
  readonly file: number;
  pos = 0;
  budget: number;
  constructor(file: number, version: number, budget: number) {
    this.rng = new Rng(file * 7919 + version * 104729 + 1);
    this.file = file;
    this.budget = budget;
  }
  ident(prefix: string, n: number): Ident {
    this.budget--;
    return new Ident(this.pos++, `${prefix}${this.rng.next(n)}`);
  }
  expr(depth: number): Node {
    this.budget--;
    const r = this.rng.next(10);
    if (depth > 3 || r < 3) return this.ident("v", 12);
    if (r < 5) return new NumLit(this.pos++, this.rng.next(50));
    if (r < 6) return new StrLit(this.pos++, `s${this.rng.next(30)}`);
    if (r < 8) {
      const left = this.expr(depth + 1);
      const right = this.expr(depth + 1);
      return new Binary(this.pos++, left, this.rng.next(4), right);
    }
    const callee = this.ident(`f${this.file}_`, 8);
    const args: Node[] = [];
    const n = this.rng.next(3);
    for (let i = 0; i < n; i++) args.push(this.expr(depth + 1));
    return new Call(this.pos++, callee, new NodeList(args));
  }
  block(depth: number): Block {
    const statements: Node[] = [];
    const n = 2 + this.rng.next(5);
    for (let i = 0; i < n && this.budget > 0; i++) {
      const r = this.rng.next(10);
      if (r < 6) statements.push(new VarDecl(this.pos++, this.ident("v", 12), this.expr(0)));
      else if (r < 8 && depth < 2) statements.push(this.block(depth + 1));
      else statements.push(new Ret(this.pos++, this.expr(0)));
      this.budget--;
    }
    return new Block(this.pos++, new NodeList(statements));
  }
  file_(name: string): SourceFile {
    const statements: Node[] = [];
    let i = 0;
    while (this.budget > 0) {
      const params: Node[] = [];
      const n = this.rng.next(4);
      for (let p = 0; p < n; p++) params.push(new Param(this.pos++, this.ident("v", 12)));
      const fname = new Ident(this.pos++, `f${this.file}_${i % 8}`);
      statements.push(new Func(this.pos++, fname, new NodeList(params), this.block(0)));
      i++;
    }
    return new SourceFile(name, `text of ${name}`, new NodeList(statements));
  }
}

// ---- binder: parents, symbols, locals, flow ----

class Binder {
  flow: Flow | undefined = undefined;
  scope: Map<string, Sym> = new Map();
  declare(name: Ident, decl: Node, flags: number): Sym {
    let sym = this.scope.get(name.text);
    if (sym === undefined) {
      sym = new Sym(name.text, flags);
      this.scope.set(name.text, sym);
    }
    sym.declarations.push(decl);
    decl.symbol = sym;
    return sym;
  }
  setParent(child: Node, parent: Node): void {
    child.parent = parent;
  }
  bindExpr(node: Node, parent: Node): void {
    this.setParent(node, parent);
    if (node instanceof Ident) {
      this.flow = new Flow(node, this.flow);
      node.flow = this.flow;
    } else if (node instanceof Binary) {
      this.bindExpr(node.left, node);
      this.bindExpr(node.right, node);
    } else if (node instanceof Call) {
      this.bindExpr(node.callee, node);
      for (const a of node.args.nodes) this.bindExpr(a, node);
    }
  }
  bindBlock(block: Block, parent: Node): void {
    this.setParent(block, parent);
    const saved = this.scope;
    this.scope = new Map();
    block.locals = this.scope;
    for (const s of block.statements.nodes) {
      if (s instanceof VarDecl) {
        this.setParent(s, block);
        this.setParent(s.name, s);
        this.bindExpr(s.init, s);
        this.declare(s.name, s, 1);
      } else if (s instanceof Block) this.bindBlock(s, block);
      else if (s instanceof Ret) {
        this.setParent(s, block);
        this.bindExpr(s.expr, s);
      }
    }
    this.scope = saved;
  }
  bindFile(file: SourceFile): void {
    file.locals = this.scope;
    for (const s of file.statements.nodes) {
      if (!(s instanceof Func)) continue;
      this.setParent(s, file);
      this.setParent(s.name, s);
      const fsym = this.declare(s.name, s, 2);
      const saved = this.scope;
      this.scope = new Map();
      fsym.members = this.scope;
      for (const p of s.params.nodes) {
        if (!(p instanceof Param)) continue;
        this.setParent(p, s);
        this.setParent(p.name, p);
        this.declare(p.name, p, 4);
      }
      this.bindBlock(s.body, s);
      this.scope = saved;
    }
  }
}

// ---- checker state: rebuilt every generation ----

abstract class Type implements ProgramLifetime {
  readonly id: number;
  readonly flags: number;
  symbol: Sym | undefined = undefined;
  constructor(id: number, flags: number) {
    this.id = id;
    this.flags = flags;
  }
}
class IntrinsicType extends Type {
  readonly name: string;
  constructor(id: number, name: string) {
    super(id, 1);
    this.name = name;
  }
}
class LiteralType extends Type {
  readonly value: string;
  regular: Type | undefined = undefined;
  constructor(id: number, value: string) {
    super(id, 2);
    this.value = value;
  }
}
class UnionType extends Type {
  readonly types: Type[];
  constructor(id: number, types: Type[]) {
    super(id, 4);
    this.types = types;
  }
}
class FunctionType extends Type {
  readonly signatures: Signature[] = [];
  readonly members = new Map<string, Type>();
  constructor(id: number, symbol: Sym) {
    super(id, 8);
    this.symbol = symbol;
  }
}
class Signature implements ProgramLifetime {
  readonly declaration: Node;
  readonly parameters: Sym[];
  returnType: Type | undefined = undefined;
  constructor(declaration: Node, parameters: Sym[]) {
    this.declaration = declaration;
    this.parameters = parameters;
  }
}
class NodeLinks implements ProgramLifetime {
  resolvedType: Type | undefined = undefined;
  resolvedSymbol: Sym | undefined = undefined;
  flags = 0;
}
class SymbolLinks implements ProgramLifetime {
  type: Type | undefined = undefined;
  target: Sym | undefined = undefined;
}

class LinkTable<T> {
  readonly pages: (T[] | undefined)[] = [];
  get(id: number): T | undefined {
    const p = id >>> 8;
    if (p >= this.pages.length) return undefined;
    const page = this.pages[p];
    if (page === undefined || (id & 255) >= page.length) return undefined;
    return page[id & 255];
  }
  set(id: number, value: T): void {
    while (this.pages.length <= id >>> 8) this.pages.push(undefined);
    let page = this.pages[id >>> 8];
    if (page === undefined) {
      page = [];
      this.pages[id >>> 8] = page;
    }
    while (page.length <= (id & 255)) page.push(value);
    page[id & 255] = value;
  }
}

class Checker {
  typeCount = 0;
  readonly nodeLinks = new LinkTable<NodeLinks>();
  readonly symbolLinks = new LinkTable<SymbolLinks>();
  readonly literals = new Map<string, LiteralType>();
  readonly unions = new Map<string, UnionType>();
  readonly globals = new Map<string, Sym>();
  readonly numberType: Type;
  readonly stringType: Type;
  readonly anyType: Type;
  diagnostics = 0;
  constructor(files: SourceFile[]) {
    this.numberType = new IntrinsicType(this.typeCount++, "number");
    this.stringType = new IntrinsicType(this.typeCount++, "string");
    this.anyType = new IntrinsicType(this.typeCount++, "any");
    for (const f of files) {
      const locals = f.locals;
      if (locals === undefined) continue;
      for (const [name, sym] of locals) if (!this.globals.has(name)) this.globals.set(name, sym);
    }
  }
  links(node: Node): NodeLinks {
    let l = this.nodeLinks.get(node.id);
    if (l === undefined) {
      l = new NodeLinks();
      this.nodeLinks.set(node.id, l);
    }
    return l;
  }
  symLinks(sym: Sym): SymbolLinks {
    if (sym.id === 0) sym.id = nextSymbolId++;
    let l = this.symbolLinks.get(sym.id);
    if (l === undefined) {
      l = new SymbolLinks();
      this.symbolLinks.set(sym.id, l);
    }
    return l;
  }
  literal(value: string): LiteralType {
    let t = this.literals.get(value);
    if (t === undefined) {
      t = new LiteralType(this.typeCount++, value);
      t.regular = t;
      this.literals.set(value, t);
    }
    return t;
  }
  union(a: Type, b: Type): Type {
    if (a === b) return a;
    const key = a.id < b.id ? `${a.id},${b.id}` : `${b.id},${a.id}`;
    let t = this.unions.get(key);
    if (t === undefined) {
      t = new UnionType(this.typeCount++, a.id < b.id ? [a, b] : [b, a]);
      this.unions.set(key, t);
    }
    return t;
  }
  resolve(name: Ident): Sym | undefined {
    for (let n: Node | undefined = name.parent; n !== undefined; n = n.parent) {
      const locals = n instanceof Block ? n.locals : n instanceof SourceFile ? n.locals : undefined;
      const s = locals?.get(name.text);
      if (s !== undefined) return s;
      if (n instanceof Func && n.symbol !== undefined) {
        const m = n.symbol.members?.get(name.text);
        if (m !== undefined) return m;
      }
    }
    return this.globals.get(name.text);
  }
  typeOfSymbol(sym: Sym): Type {
    const l = this.symLinks(sym);
    if (l.type !== undefined) return l.type;
    l.type = this.anyType;
    let t: Type = this.anyType;
    const decl = sym.declarations[0];
    if (decl instanceof VarDecl) t = this.typeOf(decl.init);
    else if (decl instanceof Func) {
      const ft = new FunctionType(this.typeCount++, sym);
      const params: Sym[] = [];
      for (const p of decl.params.nodes) if (p.symbol !== undefined) params.push(p.symbol);
      const sig = new Signature(decl, params);
      ft.signatures.push(sig);
      for (const p of params) ft.members.set(p.name, this.numberType);
      t = ft;
      l.type = t;
      sig.returnType = this.returnTypeOf(decl.body);
    } else if (decl instanceof Param) t = this.numberType;
    l.type = t;
    return t;
  }
  returnTypeOf(block: Block): Type {
    let t: Type | undefined = undefined;
    for (const s of block.statements.nodes) {
      const r = s instanceof Ret ? this.typeOf(s.expr) : s instanceof Block ? this.returnTypeOf(s) : undefined;
      if (r !== undefined) t = t === undefined ? r : this.union(t, r);
    }
    return t ?? this.anyType;
  }
  typeOf(node: Node): Type {
    const l = this.links(node);
    if (l.resolvedType !== undefined) return l.resolvedType;
    let t: Type = this.anyType;
    if (node instanceof NumLit) t = this.literal(`n${node.value}`);
    else if (node instanceof StrLit) t = this.literal(node.text);
    else if (node instanceof Ident) {
      const s = this.resolve(node);
      l.resolvedSymbol = s;
      t = s === undefined ? this.anyType : this.typeOfSymbol(s);
    } else if (node instanceof Binary) t = this.union(this.typeOf(node.left), this.typeOf(node.right));
    else if (node instanceof Call) {
      const ct = this.typeOf(node.callee);
      for (const a of node.args.nodes) this.typeOf(a);
      if (ct instanceof FunctionType) t = ct.signatures[0]!.returnType ?? this.anyType;
      else this.diagnostics++;
    }
    l.resolvedType = t;
    return t;
  }
  checkBlock(block: Block): void {
    for (const s of block.statements.nodes) {
      if (s instanceof VarDecl) {
        this.typeOf(s.init);
        if (s.symbol !== undefined) this.typeOfSymbol(s.symbol);
      } else if (s instanceof Ret) this.typeOf(s.expr);
      else if (s instanceof Block) this.checkBlock(s);
    }
  }
  checkFile(file: SourceFile): void {
    for (const s of file.statements.nodes) {
      if (!(s instanceof Func)) continue;
      if (s.symbol !== undefined) this.typeOfSymbol(s.symbol);
      this.checkBlock(s.body);
    }
  }
}

// ---- driver ----

function rssKb(key: string): number {
  const m = new RegExp(`${key}:\\s*(\\d+) kB`).exec(readFileSync("/proc/self/status", "utf8"));
  return m === null ? 0 : Number(m[1]);
}

const args = process.argv.slice(2);
const fileCount = Number(args[0] ?? "200");
const nodesPerFile = Number(args[1] ?? "2000");
const generations = Number(args[2] ?? "50");
const mode = args[3] ?? "edit";
const useRegions = args[4] !== "plain";

const files: SourceFile[] = [];
const fileRegions: (LifetimeRegion | undefined)[] = [];
const versions: number[] = [];

function parseAndBind(i: number): SourceFile {
  const file = new Parser(i, versions[i]!, nodesPerFile).file_(`f${i}.ts`);
  new Binder().bindFile(file);
  return file;
}

function parseFile(i: number): void {
  const old = fileRegions[i];
  if (useRegions) {
    const region = new LifetimeRegion();
    files[i] = region.run(() => parseAndBind(i));
    fileRegions[i] = region;
  } else files[i] = parseAndBind(i);
  old?.release();
}

let checkerRegion: LifetimeRegion | undefined;
let lastDiagnostics = 0;
let lastTypes = 0;
let lastShape = "";

function runChecker(): void {
  const checker = new Checker(files);
  for (const f of files) checker.checkFile(f);
  lastDiagnostics = checker.diagnostics;
  lastTypes = checker.typeCount;
  lastShape = `nodes ${nextNodeId} syms ${nextSymbolId} literals ${checker.literals.size} unions ${checker.unions.size} globals ${checker.globals.size}`;
}

function check(): void {
  if (!useRegions) {
    runChecker();
    return;
  }
  const region = new LifetimeRegion();
  region.run(runChecker);
  checkerRegion = region;
}

const times: number[] = [];
const rss: number[] = [];
for (let g = 0; g <= generations; g++) {
  const t0 = performance.now();
  // The previous generation's checker is unreachable once check() returns;
  // release its region before the files it points into.
  checkerRegion?.release();
  if (g === 0) {
    for (let i = 0; i < fileCount; i++) {
      versions.push(0);
      parseFile(i);
    }
  } else if (mode === "all") {
    for (let i = 0; i < fileCount; i++) {
      versions[i] = versions[i]! + 1;
      parseFile(i);
    }
  } else {
    const i = g % fileCount;
    versions[i] = versions[i]! + 1;
    parseFile(i);
  }
  check();
  times.push(performance.now() - t0);
  rss.push(rssKb("VmRSS"));
}

const last = rss.slice(-10).sort((a, b) => a - b);
const steady = last[last.length >> 1]!;
const genTimes = times.slice(1).sort((a, b) => a - b);
if (process.env.GENS_SHAPE === "1") console.log(lastShape);
console.log(
  `types ${lastTypes} diagnostics ${lastDiagnostics} gen0 ${times[0]!.toFixed(1)} ms ` +
    `median-gen ${genTimes[genTimes.length >> 1]!.toFixed(1)} ms total ${times.reduce((a, b) => a + b, 0).toFixed(0)} ms ` +
    `rss-gen0 ${(rss[0]! / 1024).toFixed(1)} MB steady ${(steady / 1024).toFixed(1)} MB peak ${(rssKb("VmHWM") / 1024).toFixed(1)} MB`,
);
if (process.env.GENS_TRACE === "1")
  for (let g = 0; g <= generations; g++) console.log(`${g}\t${times[g]!.toFixed(1)}\t${(rss[g]! / 1024).toFixed(1)}`);
