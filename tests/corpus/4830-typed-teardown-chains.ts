// Teardowns of statically typed children.
//
// A teardown that drops the last reference to a child of a known class or
// record type tears the child down directly, and hands it to the runtime's
// bounded destruction once a direct chain gets long. This program releases
// trees and lists of such types: shallow and far deeper than one chain,
// children shared with live owners (their release only decrements), nullable
// and optional child slots, records holding classes and classes holding
// records, leaf classes of a hierarchy, and children of a cycle-capable
// class that are still candidates of the cycle collector when the last
// reference goes. Every value that survives a teardown is read afterwards,
// and the sanitized lane's exit RC audit proves everything else was freed
// exactly once.
class Tree {
  readonly left: Tree | null;
  readonly right: Tree | null;
  readonly label: string;
  constructor(left: Tree | null, right: Tree | null, label: string) {
    this.left = left;
    this.right = right;
    this.label = label;
  }
}

function build(depth: number, tag: string): Tree {
  return depth === 0 ? new Tree(null, null, tag) : new Tree(build(depth - 1, tag + "l"), build(depth - 1, tag + "r"), tag);
}

function count(t: Tree | null): number {
  return t === null ? 0 : 1 + count(t.left) + count(t.right);
}

// A singly linked list far longer than one direct chain: the teardown must
// stay bounded and still free every link.
class Link {
  next: Link | null = null;
  value: number;
  constructor(value: number) {
    this.value = value;
  }
}

function list(n: number): Link {
  let head = new Link(0);
  for (let i = 1; i < n; i++) {
    const link = new Link(i);
    link.next = head;
    head = link;
  }
  return head;
}

// Records whose members are records and classes, and classes whose fields
// are records.
interface Pair {
  first: Leaf;
  rest: Pair | undefined;
}
class Leaf {
  name: string;
  box: { n: number; tag: string };
  constructor(name: string, n: number) {
    this.name = name;
    this.box = { n, tag: name.toUpperCase() };
  }
}

function pairs(n: number): Pair | undefined {
  let out: Pair | undefined = undefined;
  for (let i = 0; i < n; i++) out = { first: new Leaf(`leaf${i}`, i), rest: out };
  return out;
}

// A cycle-capable class (a node can point at any other), used acyclically:
// plain reference counting frees it, and nodes that a release just made
// cycle candidates are torn down while still buffered.
class Graph {
  next: Graph | null = null;
  other: Graph | null = null;
  id: number;
  constructor(id: number) {
    this.id = id;
  }
}

function chain(n: number): Graph {
  const head = new Graph(0);
  let tail = head;
  for (let i = 1; i < n; i++) {
    const g = new Graph(i);
    tail.next = g;
    tail = g;
  }
  return head;
}

// Leaf classes of a hierarchy: a reference of a leaf type always holds an
// instance of the leaf itself.
abstract class Expr {
  abstract value(): number;
}
class Lit extends Expr {
  n: number;
  constructor(n: number) {
    super();
    this.n = n;
  }
  value(): number {
    return this.n;
  }
}
class Add extends Expr {
  left: Expr;
  right: Lit;
  next: Add | null;
  constructor(left: Expr, right: Lit, next: Add | null) {
    super();
    this.left = left;
    this.right = right;
    this.next = next;
  }
  value(): number {
    return this.left.value() + this.right.value();
  }
}

function sums(n: number): Add {
  let chain = new Add(new Lit(0), new Lit(1), null);
  for (let i = 1; i < n; i++) chain = new Add(i % 2 === 0 ? chain : new Lit(i), new Lit(i), chain);
  return chain;
}

let total = 0;
for (let i = 0; i < 40; i++) total += count(build(8, "t"));
console.log("trees", total);

// Shared subtrees: the release from one parent only decrements.
const shared = build(5, "s");
const owners: Tree[] = [];
for (let i = 0; i < 10; i++) owners.push(new Tree(shared, build(3, `o${i}`), `owner${i}`));
owners.length = 0;
console.log("shared survives", count(shared), shared.left!.left!.label);

// One deep tree: a degenerate left spine thousands of nodes long.
let spine: Tree | null = null;
for (let i = 0; i < 5000; i++) spine = new Tree(spine, i % 7 === 0 ? new Tree(null, null, "x") : null, `n${i}`);
console.log("spine", count(spine));
spine = null;

let links = 0;
for (let round = 0; round < 4; round++) {
  const head = list(20000 + round);
  for (let l: Link | null = head; l !== null; l = l.next) links += l.value % 3;
}
console.log("links", links);

const keep = new Leaf("kept", 7);
let names = 0;
for (let round = 0; round < 3; round++) {
  let p = pairs(3000);
  p = { first: keep, rest: p };
  for (let q: Pair | undefined = p; q !== undefined; q = q.rest) names += q.first.box.n;
}
console.log("pairs", names, keep.box.tag);

let ids = 0;
for (let round = 0; round < 5; round++) {
  const head = chain(4000);
  // Release temporaries that point into the chain, so some links are cycle
  // candidates when the chain goes.
  for (let g: Graph | null = head; g !== null; g = g.next) {
    const probe = new Graph(-1);
    probe.other = g;
    ids += g.id % 5;
  }
  const middle = head.next!.next!;
  head.other = middle;
}
console.log("graphs", ids);

let exprs = 0;
const kept = new Lit(5);
for (let round = 0; round < 3; round++) {
  const top = new Add(kept, new Lit(round), sums(3000));
  exprs += top.value();
  for (let a: Add | null = top; a !== null; a = a.next) exprs += a.right.n % 4;
}
console.log("exprs", exprs, kept.value());
