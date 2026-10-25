// Runtime-length spreads that land in a typed rest parameter, including a
// `T[]` into a `(T | undefined)[]` rest: forwarding `...args` preserves
// source evaluation order, copies the spread (the callee's rest is fresh),
// and reads holes as undefined.
class Node {
  kind: number;
  pos: number;
  constructor(kind: number, pos: number) {
    this.kind = kind;
    this.pos = pos;
  }
}

class Checker {
  count = 0;
  report(node: Node | undefined, message: string, ...args: string[]): string {
    this.count++;
    const at = node === undefined ? "-" : `${node.kind}@${node.pos}`;
    return `${at} ${message} [${args.join(",")}] ${args.length}`;
  }
}

function grammarError(c: Checker, node: Node, message: string, ...args: string[]): string {
  return c.report(node, message, ...args);
}

function diagnosticAt(file: Node | undefined, node: Node | undefined, message: string, ...args: (string | undefined)[]): string {
  const shown = args.map((a) => (a === undefined ? "<undef>" : a));
  return `${file?.kind ?? "none"} ${node?.pos ?? "none"} ${message} ${shown.join("|")}`;
}

function forward(file: Node, node: Node | undefined, message: string, ...args: string[]): string {
  return diagnosticAt(file, node, message, ...args);
}

function mutateRest(...items: number[]): number {
  items.push(99);
  items[0] = -1;
  return items.length;
}

const order: string[] = [];
function note(label: string): string {
  order.push(label);
  return label;
}
function noteAll(label: string, values: string[]): string[] {
  order.push(label);
  return values;
}

function join(head: string, ...rest: string[]): string {
  return [head, ...rest].join("/");
}

const c = new Checker();
const n = new Node(80, 12);
console.log(grammarError(c, n, "missing", "a", "b"));
console.log(grammarError(c, n, "none"));
console.log(c.report(undefined, "direct", ...["x", "y", "z"]));
console.log(forward(n, n, "fwd", "p", "q"));
console.log(forward(n, undefined, "fwd-empty"));

const source = [1, 2, 3];
console.log(mutateRest(...source), source.join(","));
console.log(mutateRest(0, ...source, 4), source.join(","));

const sparse: string[] = [];
sparse[2] = "late";
console.log(diagnosticAt(n, n, "holes", ...sparse));

const xs = ["x1", "x2"];
const ys = ["y1"];
console.log(join(note("head"), ...noteAll("xs", xs), note("mid"), ...noteAll("ys", ys)));
console.log(order.join(" "));
console.log(c.count);
