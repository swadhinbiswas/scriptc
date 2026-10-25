// A small compiler in the shape of a type checker's watch mode: each build
// tokenizes and parses a set of generated source files into syntax trees,
// binds their symbols, and checks every function body (types, signatures,
// per-node and per-symbol links, literal and union caches). Builds after
// the first edit one file and rebuild everything from scratch, as watch
// modes that do not reuse syntax trees do.
//
//   compiler <files> <functions-per-file> <builds> [plain]
//
// Each build runs in a LifetimeRegion that is released once the next build
// has finished; `plain` never constructs a region.
import { readFileSync } from "node:fs";
import type { ProgramLifetime } from "@scriptc/types";
import { LifetimeRegion } from "@scriptc/experimental";

// ---- source generation (deterministic) ----

let seed = 12345;
function rand(n: number): number {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed % n;
}

function generateFile(index: number, version: number, functions: number): string {
  seed = 1000 + index * 7919 + version * 104729;
  const lines: string[] = [];
  for (let f = 0; f < functions; f++) {
    const params = 1 + rand(3);
    const names = Array.from({ length: params }, (_, i) => `p${i}`);
    lines.push(`fn f${index}_${f}(${names.join(", ")}) {`);
    const locals: string[] = [...names];
    const stmts = 4 + rand(6);
    for (let s = 0; s < stmts; s++) {
      const target = `v${s}`;
      const a = locals[rand(locals.length)]!;
      const b = rand(3) === 0 ? `${rand(100)}` : locals[rand(locals.length)]!;
      const op = ["+", "-", "*", "<", "=="][rand(5)]!;
      if (rand(5) === 0 && f > 0) lines.push(`  let ${target} = f${index}_${rand(f)}(${a});`);
      else if (rand(7) === 0) lines.push(`  let ${target} = "s${rand(10)}";`);
      else lines.push(`  let ${target} = ${a} ${op} ${b};`);
      if (rand(4) === 0) lines.push(`  if (${target} < ${rand(50)}) { return ${a}; }`);
      locals.push(target);
    }
    if (rand(9) === 0) lines.push(`  return missing${rand(5)};`);
    lines.push(`  return ${locals[locals.length - 1]};`, `}`);
  }
  return lines.join("\n");
}

// ---- tokens ----

const T_EOF = 0;
const T_IDENT = 1;
const T_NUM = 2;
const T_STR = 3;
const T_PUNCT = 4;

class Token {
  readonly kind: number;
  readonly text: string;
  readonly pos: number;
  constructor(kind: number, text: string, pos: number) {
    this.kind = kind;
    this.text = text;
    this.pos = pos;
  }
}

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < text.length) {
    const c = text.charCodeAt(i);
    if (c === 32 || c === 10) {
      i++;
      continue;
    }
    const start = i;
    if ((c >= 97 && c <= 122) || c === 95) {
      while (i < text.length && /[a-z0-9_]/.test(text[i]!)) i++;
      tokens.push(new Token(T_IDENT, text.slice(start, i), start));
    } else if (c >= 48 && c <= 57) {
      while (i < text.length && text.charCodeAt(i) >= 48 && text.charCodeAt(i) <= 57) i++;
      tokens.push(new Token(T_NUM, text.slice(start, i), start));
    } else if (c === 34) {
      i++;
      while (text.charCodeAt(i) !== 34) i++;
      i++;
      tokens.push(new Token(T_STR, text.slice(start + 1, i - 1), start));
    } else if (text.startsWith("==", i)) {
      i += 2;
      tokens.push(new Token(T_PUNCT, "==", start));
    } else {
      i++;
      tokens.push(new Token(T_PUNCT, text[start]!, start));
    }
  }
  tokens.push(new Token(T_EOF, "", text.length));
  return tokens;
}

// ---- syntax trees (program-lifetime) ----

abstract class Node implements ProgramLifetime {
  readonly pos: number;
  parent: Node | undefined = undefined;
  id = 0;
  constructor(pos: number) {
    this.pos = pos;
  }
}

class Ident extends Node {
  readonly text: string;
  symbol: Sym | undefined = undefined;
  constructor(pos: number, text: string) {
    super(pos);
    this.text = text;
  }
}
class NumLit extends Node {
  readonly value: number;
  constructor(pos: number, value: number) {
    super(pos);
    this.value = value;
  }
}
class StrLit extends Node {
  readonly value: string;
  constructor(pos: number, value: string) {
    super(pos);
    this.value = value;
  }
}
class BinaryExpr extends Node {
  readonly op: string;
  readonly left: Node;
  readonly right: Node;
  constructor(pos: number, op: string, left: Node, right: Node) {
    super(pos);
    this.op = op;
    this.left = left;
    this.right = right;
  }
}
class CallExpr extends Node {
  readonly callee: Ident;
  readonly args: Node[];
  constructor(pos: number, callee: Ident, args: Node[]) {
    super(pos);
    this.callee = callee;
    this.args = args;
  }
}
class LetStmt extends Node {
  readonly name: Ident;
  readonly init: Node;
  constructor(pos: number, name: Ident, init: Node) {
    super(pos);
    this.name = name;
    this.init = init;
  }
}
class ReturnStmt extends Node {
  readonly value: Node;
  constructor(pos: number, value: Node) {
    super(pos);
    this.value = value;
  }
}
class IfStmt extends Node {
  readonly cond: Node;
  readonly body: Node[];
  constructor(pos: number, cond: Node, body: Node[]) {
    super(pos);
    this.cond = cond;
    this.body = body;
  }
}
class FnDecl extends Node {
  readonly name: Ident;
  readonly params: Ident[];
  readonly body: Node[];
  locals: Map<string, Sym> = new Map();
  constructor(pos: number, name: Ident, params: Ident[], body: Node[]) {
    super(pos);
    this.name = name;
    this.params = params;
    this.body = body;
  }
}
class SourceFile extends Node {
  readonly fileName: string;
  readonly decls: FnDecl[];
  readonly locals = new Map<string, Sym>();
  constructor(fileName: string, decls: FnDecl[]) {
    super(0);
    this.fileName = fileName;
    this.decls = decls;
  }
}

class Sym implements ProgramLifetime {
  readonly name: string;
  readonly flags: number;
  readonly declarations: Node[] = [];
  id = 0;
  constructor(name: string, flags: number) {
    this.name = name;
    this.flags = flags;
  }
}
const S_FN = 1;
const S_VAR = 2;
const S_PARAM = 4;

let nextNodeId = 1;
let nextSymId = 1;

class Parser {
  private readonly tokens: Token[];
  private i = 0;
  constructor(text: string) {
    this.tokens = tokenize(text);
  }
  private peek(): Token {
    return this.tokens[this.i]!;
  }
  private next(): Token {
    return this.tokens[this.i++]!;
  }
  private expect(text: string): void {
    const t = this.next();
    if (t.text !== text) throw new Error(`expected '${text}' at ${t.pos}, got '${t.text}'`);
  }
  private finish<T extends Node>(node: T): T {
    node.id = nextNodeId++;
    return node;
  }
  private ident(): Ident {
    const t = this.next();
    return this.finish(new Ident(t.pos, t.text));
  }
  file(fileName: string): SourceFile {
    const decls: FnDecl[] = [];
    while (this.peek().kind !== T_EOF) decls.push(this.fn());
    const file = this.finish(new SourceFile(fileName, decls));
    for (const d of decls) d.parent = file;
    return file;
  }
  private fn(): FnDecl {
    const pos = this.next().pos; // fn
    const name = this.ident();
    this.expect("(");
    const params: Ident[] = [];
    while (this.peek().text !== ")") {
      params.push(this.ident());
      if (this.peek().text === ",") this.next();
    }
    this.expect(")");
    const body = this.block();
    const decl = this.finish(new FnDecl(pos, name, params, body));
    name.parent = decl;
    for (const p of params) p.parent = decl;
    for (const s of body) s.parent = decl;
    return decl;
  }
  private block(): Node[] {
    this.expect("{");
    const stmts: Node[] = [];
    while (this.peek().text !== "}") stmts.push(this.stmt());
    this.expect("}");
    return stmts;
  }
  private stmt(): Node {
    const t = this.peek();
    if (t.text === "let") {
      this.next();
      const name = this.ident();
      this.expect("=");
      const init = this.expr();
      this.expect(";");
      const s = this.finish(new LetStmt(t.pos, name, init));
      name.parent = s;
      init.parent = s;
      return s;
    }
    if (t.text === "return") {
      this.next();
      const value = this.expr();
      this.expect(";");
      const s = this.finish(new ReturnStmt(t.pos, value));
      value.parent = s;
      return s;
    }
    this.next(); // if
    this.expect("(");
    const cond = this.expr();
    this.expect(")");
    const body = this.block();
    const s = this.finish(new IfStmt(t.pos, cond, body));
    cond.parent = s;
    for (const b of body) b.parent = s;
    return s;
  }
  private expr(): Node {
    let left = this.primary();
    while (["+", "-", "*", "<", "=="].includes(this.peek().text)) {
      const op = this.next();
      const right = this.primary();
      const bin = this.finish(new BinaryExpr(op.pos, op.text, left, right));
      left.parent = bin;
      right.parent = bin;
      left = bin;
    }
    return left;
  }
  private primary(): Node {
    const t = this.peek();
    if (t.kind === T_NUM) {
      this.next();
      return this.finish(new NumLit(t.pos, Number(t.text)));
    }
    if (t.kind === T_STR) {
      this.next();
      return this.finish(new StrLit(t.pos, t.text));
    }
    const name = this.ident();
    if (this.peek().text !== "(") return name;
    this.next();
    const args: Node[] = [];
    while (this.peek().text !== ")") {
      args.push(this.expr());
      if (this.peek().text === ",") this.next();
    }
    this.expect(")");
    const call = this.finish(new CallExpr(name.pos, name, args));
    name.parent = call;
    for (const a of args) a.parent = call;
    return call;
  }
}

// ---- binder ----

function declare(table: Map<string, Sym>, name: Ident, flags: number): Sym {
  let sym = table.get(name.text);
  if (sym === undefined) {
    sym = new Sym(name.text, flags);
    sym.id = nextSymId++;
    table.set(name.text, sym);
  }
  sym.declarations.push(name.parent ?? name);
  name.symbol = sym;
  return sym;
}

function bindFile(file: SourceFile): void {
  for (const fn of file.decls) declare(file.locals, fn.name, S_FN);
  for (const fn of file.decls) {
    for (const p of fn.params) declare(fn.locals, p, S_PARAM);
    const visit = (stmts: Node[]): void => {
      for (const s of stmts) {
        if (s instanceof LetStmt) declare(fn.locals, s.name, S_VAR);
        else if (s instanceof IfStmt) visit(s.body);
      }
    };
    visit(fn.body);
  }
}

// ---- checker ----

const K_NUM = 1;
const K_STR = 2;
const K_BOOL = 3;
const K_LIT = 4;
const K_UNION = 5;
const K_FN = 6;
const K_ERR = 7;

class Type implements ProgramLifetime {
  readonly kind: number;
  readonly id: number;
  readonly value: number;
  readonly members: Type[];
  readonly signature: Signature | undefined;
  constructor(kind: number, id: number, value: number, members: Type[], signature: Signature | undefined) {
    this.kind = kind;
    this.id = id;
    this.value = value;
    this.members = members;
    this.signature = signature;
  }
}

class Signature implements ProgramLifetime {
  readonly declaration: FnDecl;
  readonly params: Type[];
  ret: Type | undefined = undefined;
  constructor(declaration: FnDecl, params: Type[]) {
    this.declaration = declaration;
    this.params = params;
  }
}

class NodeLinks implements ProgramLifetime {
  resolvedType: Type | undefined = undefined;
  resolvedSymbol: Sym | undefined = undefined;
  flags = 0;
}

class SymbolLinks implements ProgramLifetime {
  type: Type | undefined = undefined;
  readonly target: Sym;
  constructor(target: Sym) {
    this.target = target;
  }
}

class Diagnostic {
  readonly file: string;
  readonly pos: number;
  readonly message: string;
  constructor(file: string, pos: number, message: string) {
    this.file = file;
    this.pos = pos;
    this.message = message;
  }
}

// Ordinary (reference-counted) checker state: paged link tables indexed by
// node and symbol ids, and the caches that point into them.
class LinkTable<T> {
  private readonly pages: (T | undefined)[][] = [];
  get(id: number): T | undefined {
    return this.pages[id >> 8]?.[id & 255];
  }
  set(id: number, value: T): void {
    let page = this.pages[id >> 8];
    if (page === undefined) {
      page = [];
      while (this.pages.length <= id >> 8) this.pages.push([]);
      this.pages[id >> 8] = page;
    }
    while (page.length <= (id & 255)) page.push(undefined);
    page[id & 255] = value;
  }
}

class Checker {
  private nextTypeId = 1;
  readonly numberType: Type;
  readonly stringType: Type;
  readonly boolType: Type;
  readonly errorType: Type;
  readonly literals = new Map<number, Type>();
  readonly unions = new Map<string, Type>();
  private readonly nodeLinks = new LinkTable<NodeLinks>();
  private readonly symbolLinks = new LinkTable<SymbolLinks>();
  readonly diagnostics: Diagnostic[] = [];
  readonly files: SourceFile[];
  constructor(files: SourceFile[]) {
    this.files = files;
    this.numberType = this.type(K_NUM, 0, [], undefined);
    this.stringType = this.type(K_STR, 0, [], undefined);
    this.boolType = this.type(K_BOOL, 0, [], undefined);
    this.errorType = this.type(K_ERR, 0, [], undefined);
  }
  get typeCount(): number {
    return this.nextTypeId - 1;
  }
  private type(kind: number, value: number, members: Type[], signature: Signature | undefined): Type {
    return new Type(kind, this.nextTypeId++, value, members, signature);
  }
  private literal(value: number): Type {
    let t = this.literals.get(value);
    if (t === undefined) {
      t = this.type(K_LIT, value, [], undefined);
      this.literals.set(value, t);
    }
    return t;
  }
  private widen(t: Type): Type {
    return t.kind === K_LIT ? this.numberType : t;
  }
  private union(a: Type, b: Type): Type {
    if (a === b) return a;
    const key = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
    let t = this.unions.get(key);
    if (t === undefined) {
      t = this.type(K_UNION, 0, a.id < b.id ? [a, b] : [b, a], undefined);
      this.unions.set(key, t);
    }
    return t;
  }
  private links(node: Node): NodeLinks {
    let l = this.nodeLinks.get(node.id);
    if (l === undefined) {
      l = new NodeLinks();
      this.nodeLinks.set(node.id, l);
    }
    return l;
  }
  private symLinks(sym: Sym): SymbolLinks {
    let l = this.symbolLinks.get(sym.id);
    if (l === undefined) {
      l = new SymbolLinks(sym);
      this.symbolLinks.set(sym.id, l);
    }
    return l;
  }
  private error(node: Node, message: string): void {
    let file: Node | undefined = node;
    while (file !== undefined && !(file instanceof SourceFile)) file = file.parent;
    this.diagnostics.push(new Diagnostic(file instanceof SourceFile ? file.fileName : "?", node.pos, message));
  }
  private resolve(name: Ident, fn: FnDecl, file: SourceFile): Sym | undefined {
    const links = this.links(name);
    if (links.resolvedSymbol !== undefined) return links.resolvedSymbol;
    const sym = fn.locals.get(name.text) ?? file.locals.get(name.text);
    links.resolvedSymbol = sym;
    return sym;
  }
  private signatureOf(fn: FnDecl): Signature {
    const sym = fn.name.symbol!;
    const links = this.symLinks(sym);
    if (links.type === undefined) {
      const sig = new Signature(fn, fn.params.map(() => this.numberType));
      links.type = this.type(K_FN, 0, [], sig);
    }
    return links.type.signature!;
  }
  private typeOf(node: Node, fn: FnDecl, file: SourceFile): Type {
    const links = this.links(node);
    if (links.resolvedType !== undefined) return links.resolvedType;
    let t: Type;
    if (node instanceof NumLit) t = this.literal(node.value);
    else if (node instanceof StrLit) t = this.stringType;
    else if (node instanceof Ident) {
      const sym = this.resolve(node, fn, file);
      if (sym === undefined) {
        this.error(node, `Cannot find name '${node.text}'.`);
        t = this.errorType;
      } else if (sym.flags & S_FN) t = this.symLinks(sym).type ?? this.numberType;
      else {
        const sl = this.symLinks(sym);
        if (sl.type === undefined) {
          const decl = sym.declarations[0]!;
          sl.type = decl instanceof LetStmt ? this.widen(this.typeOf(decl.init, fn, file)) : this.numberType;
        }
        t = sl.type;
      }
    } else if (node instanceof BinaryExpr) {
      const l = this.typeOf(node.left, fn, file);
      const r = this.typeOf(node.right, fn, file);
      if (node.op === "<" || node.op === "==") t = this.boolType;
      else if (l === this.stringType || r === this.stringType) {
        if (node.op !== "+") this.error(node, `Operator '${node.op}' cannot be applied to a string.`);
        t = this.stringType;
      } else t = this.union(this.widen(l), this.widen(r));
    } else if (node instanceof CallExpr) {
      const sym = this.resolve(node.callee, fn, file);
      if (sym === undefined || !(sym.flags & S_FN)) {
        this.error(node, `'${node.callee.text}' is not callable.`);
        t = this.errorType;
      } else {
        const target = sym.declarations[0] as FnDecl;
        const sig = this.signatureOf(target);
        if (node.args.length > sig.params.length) this.error(node, `Expected ${sig.params.length} arguments.`);
        for (const a of node.args) this.typeOf(a, fn, file);
        t = sig.ret ?? this.numberType;
      }
    } else t = this.errorType;
    links.resolvedType = t;
    return t;
  }
  private checkStmts(stmts: Node[], fn: FnDecl, file: SourceFile, sig: Signature): void {
    for (const s of stmts) {
      if (s instanceof LetStmt) this.typeOf(s.init, fn, file);
      else if (s instanceof ReturnStmt) {
        const t = this.widen(this.typeOf(s.value, fn, file));
        sig.ret = sig.ret === undefined ? t : this.union(sig.ret, t);
      } else if (s instanceof IfStmt) {
        if (this.typeOf(s.cond, fn, file) !== this.boolType) this.error(s.cond, "Condition must be a boolean.");
        this.checkStmts(s.body, fn, file, sig);
      }
    }
  }
  checkFile(file: SourceFile): void {
    for (const fn of file.decls) this.checkStmts(fn.body, fn, file, this.signatureOf(fn));
  }
}

// ---- driver ----

function rssMb(key: string): number {
  const m = new RegExp(`${key}:\\s*(\\d+) kB`).exec(readFileSync("/proc/self/status", "utf8"));
  return m === null ? 0 : Number(m[1]) / 1024;
}

const args = process.argv.slice(2);
const fileCount = Number(args[0] ?? "200");
const functionsPerFile = Number(args[1] ?? "60");
const builds = Number(args[2] ?? "10");
const useRegions = args[3] !== "plain";
const versions = Array.from({ length: fileCount }, () => 0);

function build(): string {
  const files: SourceFile[] = [];
  for (let i = 0; i < fileCount; i++) {
    const file = new Parser(generateFile(i, versions[i]!, functionsPerFile)).file(`f${i}.src`);
    bindFile(file);
    files.push(file);
  }
  const checker = new Checker(files);
  for (const file of files) checker.checkFile(file);
  const first = checker.diagnostics[0];
  return `${checker.diagnostics.length} diagnostics, ${checker.typeCount} types, ${checker.unions.size} unions` +
    (first === undefined ? "" : `; first ${first.file}:${first.pos} ${first.message}`);
}

const times: number[] = [];
const rss: number[] = [];
let summary = "";
let previous: LifetimeRegion | undefined;
for (let b = 0; b < builds; b++) {
  const t0 = performance.now();
  if (b > 0) versions[b % fileCount] = versions[b % fileCount]! + 1;
  if (useRegions) {
    const region = new LifetimeRegion();
    summary = region.run(build);
    previous?.release();
    previous = region;
  } else summary = build();
  times.push(performance.now() - t0);
  rss.push(rssMb("VmRSS"));
}
const rebuilds = times.slice(1).sort((a, b) => a - b);
console.log(summary);
console.log(
  `build0 ${times[0]!.toFixed(1)} ms` +
    (rebuilds.length > 0 ? ` median-rebuild ${rebuilds[rebuilds.length >> 1]!.toFixed(1)} ms` : "") +
    ` total ${times.reduce((a, b) => a + b, 0).toFixed(0)} ms rss-build0 ${rss[0]!.toFixed(1)} MB` +
    ` rss-last ${rss[rss.length - 1]!.toFixed(1)} MB peak ${rssMb("VmHWM").toFixed(1)} MB`,
);
