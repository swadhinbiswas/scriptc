import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";
import { publish } from "@scriptc/threads";

// Values that move from one union type into another while keeping their
// arm: visitors, closures and captures, arrays, maps, async functions,
// generators, a published worker graph, and a cycle through a union field.
// Each conversion keeps the value, so every reader sees the same payload.

type Add = { kind: "add"; left: Expr; right: Expr };
type Neg = { kind: "neg"; operand: Expr };
type Lit = { kind: "lit"; value: number };
type Ref = { kind: "ref"; name: string };
type Expr = Add | Neg | Lit | Ref;
type Branch = Add | Neg;
type Leaf = Lit | Ref;
type Unary = Neg | Lit | Ref;

function lit(value: number): Lit {
  return { kind: "lit", value };
}

function show(e: Expr): string {
  switch (e.kind) {
    case "add":
      return `(${show(e.left)} + ${show(e.right)})`;
    case "neg":
      return `-${show(e.operand)}`;
    case "lit":
      return String(e.value);
    case "ref":
      return e.name;
  }
}

function evaluate(e: Expr, env: Map<string, number>): number {
  switch (e.kind) {
    case "add":
      return evaluate(e.left, env) + evaluate(e.right, env);
    case "neg":
      return -evaluate(e.operand, env);
    case "lit":
      return e.value;
    case "ref":
      return env.get(e.name) ?? 0;
  }
}

// A visitor over children of the wider union, entered with narrower ones.
function everyChild(e: Expr, visit: (child: Expr) => boolean): boolean {
  if (e.kind === "add") return visit(e.left) && visit(e.right);
  if (e.kind === "neg") return visit(e.operand);
  return true;
}

function count(e: Expr): number {
  let n = 1;
  everyChild(e, (child) => {
    n += count(child);
    return true;
  });
  return n;
}

function countBranch(b: Branch): number {
  return count(b);
}

function countUnary(u: Unary): number {
  return count(u);
}

function widenLeaf(l: Leaf): Expr {
  return l;
}

function widenBranch(b: Branch): Expr {
  return b;
}

// The worker re-runs this module: only the main thread prints the demos.
function log(...parts: (string | number)[]): void {
  if (isMainThread) console.log(parts.join(" "));
}

const env = new Map<string, number>([
  ["x", 4],
  ["y", -2],
]);

// Visitors and fresh arguments.
const x: Ref = { kind: "ref", name: "x" };
const sum: Add = { kind: "add", left: lit(1), right: { kind: "neg", operand: x } };
log("visit", show(sum), count(sum), countBranch(sum), countUnary({ kind: "neg", operand: sum }));
const fresh: Expr[] = [];
for (let i = 0; i < 4; i++) fresh.push(widenLeaf({ kind: "lit", value: i }));
fresh.push(widenBranch({ kind: "neg", operand: fresh[1]! }));
log("fresh", fresh.map(show).join(" "), evaluate(fresh[4]!, env));

// Arrays of narrower unions read as the wider one.
const leaves: Leaf[] = [lit(3), x, { kind: "ref", name: "y" }];
const exprs: Expr[] = [];
for (const leaf of leaves) exprs.push(leaf);
const branches: Branch[] = [sum, { kind: "neg", operand: leaves[2]! }];
for (const branch of branches) exprs.push(branch);
log("arrays", exprs.map(show).join(" | "), exprs.reduce((a, e) => a + evaluate(e, env), 0));

// Closures returning captured values, and a captured value reassigned.
const thunks: (() => Expr)[] = [];
for (const leaf of leaves) thunks.push(() => leaf);
let current: Unary = lit(10);
const read = (): Expr => current;
const first = read();
current = { kind: "neg", operand: first };
log("closures", thunks.map((t) => show(t())).join(","), show(first), show(read()));

// Map values convert on the way in and out.
const byName = new Map<string, Leaf>();
for (const leaf of leaves) byName.set(show(leaf), leaf);
const wide = new Map<string, Expr>();
for (const [key, leaf] of byName) wide.set(key, leaf);
wide.set("sum", sum);
const fromMap = wide.get("x");
log("maps", [...wide.keys()].join(","), fromMap === undefined ? "missing" : show(fromMap));

// Async functions and generators.
async function later(l: Leaf): Promise<Expr> {
  await null;
  return l;
}

function* walk(e: Expr): Generator<Leaf> {
  if (e.kind === "lit" || e.kind === "ref") {
    yield e;
    return;
  }
  if (e.kind === "neg") {
    yield* walk(e.operand);
    return;
  }
  yield* walk(e.left);
  yield* walk(e.right);
}

function* asExprs(items: Generator<Leaf>): Generator<Expr> {
  for (const item of items) yield item;
}

const walked: string[] = [];
for (const e of asExprs(walk(sum))) walked.push(show(e));
log("generators", walked.join(","));

// A union field that closes a cycle through the converted value.
class Cell {
  name: string;
  link: Cell | Lit | undefined = undefined;
  constructor(name: string) {
    this.name = name;
  }
}
type Target = Cell | Lit;

function attach(cell: Cell, target: Target): void {
  cell.link = target;
}

function describe(cell: Cell): string {
  const link = cell.link;
  if (link === undefined) return `${cell.name}->none`;
  if (link instanceof Cell) return `${cell.name}->${link.name}`;
  return `${cell.name}->${link.value}`;
}

const cycleNames: string[] = [];
for (let round = 0; round < 3; round++) {
  const a = new Cell(`a${round}`);
  const b = new Cell(`b${round}`);
  attach(a, b);
  attach(b, a);
  cycleNames.push(describe(a), describe(b));
  attach(a, lit(round));
  cycleNames.push(describe(a));
  attach(a, b);
}
log("cycle", cycleNames.join(" "));

// Many conversions of the same values, kept and then dropped.
let total = 0;
for (let i = 0; i < 2000; i++) {
  const kept: Expr[] = [];
  for (const leaf of leaves) kept.push(widenLeaf(leaf));
  kept.push(widenBranch(branches[i % 2]!));
  total += kept.length + evaluate(kept[i % kept.length]!, env);
}
log("repeat", total);

// A published graph whose union fields the worker reads as a wider union.
class Holder {
  label: string;
  item: Leaf;
  extra: Branch | undefined;
  constructor(label: string, item: Leaf, extra: Branch | undefined) {
    this.label = label;
    this.item = item;
    this.extra = extra;
  }
}

function summarize(holders: Holder[]): string {
  const parts: string[] = [];
  for (const holder of holders) {
    const item: Expr = holder.item;
    const extra: Expr | undefined = holder.extra;
    parts.push(`${holder.label}=${show(item)}${extra === undefined ? "" : `/${show(extra)}`}`);
  }
  return parts.join(" ");
}

if (isMainThread) {
  void later(x).then((e) => console.log("async", show(e), evaluate(e, env)));
  const holders = publish([
    new Holder("one", lit(1), undefined),
    new Holder("two", x, sum),
    new Holder("three", { kind: "ref", name: "z" }, { kind: "neg", operand: x }),
  ]);
  console.log("main", summarize(holders));
  const worker = new Worker(new URL(import.meta.url), { workerData: holders });
  worker.on("message", (message: string) => console.log("worker", message));
  worker.on("exit", (code: number) => console.log("exit", code));
} else {
  const holders = publish(workerData as Holder[]);
  parentPort!.postMessage(summarize(holders));
}
