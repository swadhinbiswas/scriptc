import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";
import { publish } from "@scriptc/threads";
import type { ProgramLifetime } from "@scriptc/types";

// ProgramLifetime graphs published with @scriptc/threads. scriptc never
// frees program-lifetime instances and takes no reference counts on them;
// publish() still makes them immutable and shares them by reference with
// other threads, exactly like mortal objects, while Node.js deep-freezes
// them and clones what it posts. Instances that are not published stay
// writable and are cloned by workerData and postMessage. Receivers publish()
// what they receive and read only fields, so both runtimes print the same.

abstract class SyntaxNode implements ProgramLifetime {
  readonly kind: string;
  parent: SyntaxNode | undefined = undefined;
  readonly pos: number;
  flags = 0;
  constructor(kind: string, pos: number) {
    this.kind = kind;
    this.pos = pos;
  }
  abstract describe(): string;
}

class Name extends SyntaxNode {
  readonly text: string;
  symbol: Sym | undefined = undefined;
  constructor(pos: number, text: string) {
    super("name", pos);
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
    super("call", pos);
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
  readonly members = new Map<string, Sym>();
  uses = 0;
  constructor(name: string) {
    this.name = name;
  }
}

class Counter implements ProgramLifetime {
  readonly label: string;
  count = 0;
  constructor(label: string) {
    this.label = label;
  }
}

// Mortal (reference-counted, collected) classes around the program-lifetime
// objects.
class Scope {
  parent: Scope | undefined;
  readonly symbols = new Map<string, Sym>();
  readonly seen = new Set<SyntaxNode>();
  span: { pos: number; end: number };
  constructor(parent: Scope | undefined, pos: number) {
    this.parent = parent;
    this.span = { pos, end: pos + 100 };
  }
}

class Unit {
  readonly calls: Call[] = [];
  readonly globals: Scope;
  readonly inner: Scope;
  readonly declared = new Map<Sym, SyntaxNode[]>();
  readonly symbols: Sym[] = [];
  note: string;
  constructor(note: string) {
    this.note = note;
    this.globals = new Scope(undefined, 0);
    this.inner = new Scope(this.globals, 10);
  }
}

class Bundle {
  hook: () => number;
  readonly first: Name;
  constructor(first: Name, hook: () => number) {
    this.first = first;
    this.hook = hook;
  }
}

function build(prefix: string): Unit {
  const unit = new Unit(`${prefix}unit`);
  const log = new Sym(`${prefix}log`);
  const value = new Sym(`${prefix}value`);
  // A cycle through a map of program-lifetime objects.
  log.members.set("self", log);
  log.members.set("value", value);
  value.members.set("owner", log);
  for (let i = 0; i < 3; i++) {
    const callee = new Name(i * 10, `${prefix}log`);
    callee.symbol = log;
    const call = new Call(i * 10 + 1, callee);
    const arg = new Name(i * 10 + 5, `${prefix}value`);
    arg.symbol = value;
    call.add(arg);
    if (i === 2) call.add(new Call(i * 10 + 7, new Name(i * 10 + 8, `${prefix}inner`)));
    log.declarations.push(callee);
    value.declarations.push(arg);
    unit.calls.push(call);
    unit.inner.seen.add(call);
  }
  unit.globals.symbols.set(log.name, log);
  unit.inner.symbols.set(value.name, value);
  unit.declared.set(log, log.declarations);
  unit.declared.set(value, value.declarations);
  unit.symbols.push(log, value);
  return unit;
}

// Field reads only: a receiver's Node.js clone has no prototype.
function node(n: SyntaxNode): string {
  let out = `${n.kind}@${n.pos}`;
  if (n.flags !== 0) out += `!${n.flags}`;
  if (n.parent !== undefined) out += `^${n.parent.pos}`;
  if (n.kind === "name") {
    const name = n as Name;
    out += `:${name.text}`;
    if (name.symbol !== undefined) out += `->${name.symbol.name}`;
  } else {
    const call = n as Call;
    out += `(${node(call.callee)}`;
    for (const a of call.args) out += ` ${node(a)}`;
    out += ")";
  }
  return out;
}

function sym(s: Sym): string {
  let out = `${s.name}#${s.uses}[${s.declarations.map((d) => d.pos).join(",")}]`;
  for (const [k, m] of s.members) out += ` ${k}=${m.name}`;
  return out;
}

function summarize(u: Unit): string {
  let out = `${u.note}: ${u.calls.map((c) => node(c)).join(" ")}`;
  for (const s of u.symbols) out += ` | ${sym(s)}`;
  for (const [s, decls] of u.declared) out += ` | ${s.name}:${decls.length}`;
  out += ` | globals ${[...u.globals.symbols.keys()].join(",")}`;
  out += ` | inner ${[...u.inner.symbols.keys()].join(",")} seen ${u.inner.seen.size}`;
  out += ` ${u.inner.span.pos}-${u.inner.span.end} up ${u.inner.parent === u.globals}`;
  return out;
}

const lines: string[] = [];
function log(line: string): void {
  if (isMainThread) console.log(line);
  else lines.push(line);
}

function attempt(what: string, write: () => void): void {
  try {
    write();
    log(`${what} wrote`);
  } catch (e) {
    // A receiver's objects keep their class in scriptc and arrive as plain
    // clones in Node.js, so its messages name the class differently.
    const message = isMainThread ? (e as Error).message : (e as Error).message.replace(/#<\w+>/, "#<?>");
    log(`${what} ${(e as Error).name} ${message}`);
  }
}

function writes(side: string, u: Unit): void {
  const call = u.calls[1]!;
  const base: SyntaxNode = call.callee;
  const value = u.symbols[1]!;
  attempt(`${side} node field`, () => {
    call.callee.symbol = undefined;
  });
  attempt(`${side} base field`, () => {
    base.flags = 4;
  });
  attempt(`${side} parent`, () => {
    call.parent = call;
  });
  attempt(`${side} symbol increment`, () => {
    value.uses++;
  });
  attempt(`${side} members set`, () => {
    value.members.set("again", value);
  });
  attempt(`${side} declarations push`, () => {
    value.declarations.push(call);
  });
  attempt(`${side} args index`, () => {
    call.args[0] = call;
  });
  attempt(`${side} declared delete`, () => {
    u.declared.delete(value);
  });
  attempt(`${side} seen add`, () => {
    u.inner.seen.add(base);
  });
  attempt(`${side} scope field`, () => {
    u.inner.parent = undefined;
  });
  attempt(`${side} span`, () => {
    u.inner.span.end = 1;
  });
  attempt(`${side} note`, () => {
    u.note = "changed";
  });
}

if (isMainThread) {
  // Unpublished instances of the same classes stay writable.
  const scratch = build("s-");
  scratch.calls[0]!.flags = 3;
  scratch.calls[0]!.callee.symbol = scratch.symbols[1];
  scratch.symbols[0]!.uses++;
  scratch.symbols[0]!.members.set("extra", scratch.symbols[0]!);
  scratch.symbols[0]!.declarations.push(scratch.calls[2]!);
  console.log("scratch", summarize(scratch));
  console.log("dispatch", scratch.calls.map((c) => c.describe()).join("; "));

  // A refused publish leaves the program-lifetime objects it already
  // visited unpublished and writable.
  const k = scratch.calls.length;
  const bundle = new Bundle(scratch.calls[1]!.callee, () => k);
  attempt("publish function", () => {
    publish(bundle);
  });
  bundle.first.flags = 7;
  bundle.first.symbol!.uses = 5;
  bundle.first.parent!.flags = 8;
  bundle.hook = () => 2 * k;
  console.log("after refusal", node(bundle.first.parent!), sym(bundle.first.symbol!), bundle.hook());

  // A program-lifetime root, published directly.
  const lone = publish(new Name(500, "lone"));
  attempt("lone field", () => {
    lone.flags = 1;
  });
  console.log("lone", node(lone), publish(lone) === lone);

  const root = publish(build(""));
  console.log("main", summarize(root));
  console.log("dispatch", root.calls.map((c) => c.describe()).join("; "));
  console.log("same", publish(root) === root, publish(root.calls[0]!) === root.calls[0]);
  writes("main", root);
  console.log("after writes", summarize(root));

  // A later graph that reaches already published program-lifetime objects
  // and new ones.
  const later = new Unit("later");
  later.calls.push(root.calls[0]!, new Call(900, new Name(901, "fresh")));
  later.symbols.push(root.symbols[0]!);
  later.declared.set(root.symbols[0]!, root.symbols[0]!.declarations);
  publish(later);
  attempt("later fresh", () => {
    later.calls[1]!.flags = 2;
  });
  console.log("later", summarize(later));

  // Not published: workerData clones it, so the worker's writes stay there.
  const loose = new Counter("loose");
  loose.count = 1;
  const worker = new Worker(new URL(import.meta.url), { workerData: { root, label: "data", loose } });
  worker.on("message", (message: unknown) => {
    const reply = message as { lines: string[]; summary: string; mine: Unit };
    publish(reply.mine);
    for (const line of reply.lines) console.log(line);
    console.log("from worker", reply.summary);
    console.log("worker graph", summarize(reply.mine));
    loose.count++;
  });
  worker.on("exit", (code: number) => {
    console.log("exit", code, "loose", loose.label, loose.count);
  });
} else {
  const data = workerData as { root: Unit; label: string; loose: unknown };
  const root = publish(data.root);
  log(`worker ${data.label} ${summarize(root)}`);
  writes("worker", root);
  const loose = data.loose as { label: string; count: number };
  loose.count = 99;
  log(`worker loose ${loose.label} ${loose.count}`);
  const mine = publish(build("w-"));
  parentPort!.postMessage({ lines, summary: summarize(root), mine });
}
