// Locals that only walk pointers reachable from parameters (parent chains,
// checked casts, nullable fields) hold borrowed pointers when nothing in the
// function can remove a heap edge. Cases where an edge is removed, a root is
// rebound, or the walk starts at an owned temporary must keep ownership: the
// sanitized lane catches a borrow of a freed object.

class Node {
  parent: Node | undefined;
  kind: number;
  constructor(kind: number, parent: Node | undefined) {
    this.kind = kind;
    this.parent = parent;
  }
}

class SourceFile extends Node {
  fileName: string;
  constructor(fileName: string) {
    super(0, undefined);
    this.fileName = fileName;
  }
}

function sourceFileOf(node: Node): SourceFile {
  let parent = node.parent;
  if (parent === undefined) return node as SourceFile;
  for (;;) {
    const next: Node | undefined = parent.parent;
    if (next === undefined) return parent as SourceFile;
    parent = next;
  }
}

function depth(node: Node | undefined): number {
  let n = 0;
  let current = node;
  while (current !== undefined) {
    n++;
    current = current.parent;
  }
  return n;
}

function ancestorOfKind(node: Node, kind: number): Node | undefined {
  let current: Node | undefined = node;
  while (current !== undefined && current.kind !== kind) current = current.parent;
  return current;
}

// Two walks advancing in lockstep, with a checked cast at the end.
function commonRoot(a: Node, b: Node): string {
  let x: Node = a;
  let y: Node = b;
  while (x.parent !== undefined) x = x.parent;
  while (y.parent !== undefined) y = y.parent;
  const fx = x as SourceFile;
  const fy = y as SourceFile;
  return fx === fy ? fx.fileName : fx.fileName + "|" + fy.fileName;
}

// A callee that cuts the chain: the loop's `next` must own its node.
function cut(node: Node): void {
  node.parent = undefined;
}

function cutWalk(node: Node): number {
  let count = 0;
  let current = node.parent;
  while (current !== undefined) {
    const next = current.parent;
    cut(current);
    count += next === undefined ? 0 : next.kind;
    current = next;
  }
  return count;
}

// A rebound parameter is not a root.
function climb(node: Node, steps: number): number {
  let total = 0;
  for (let i = 0; i < steps && node.parent !== undefined; i++) {
    node = node.parent;
    const here = node;
    total += here.kind;
  }
  return total;
}

// Rebound parameters walk too (they keep the borrowed convention), unless
// the body removes an edge: here the old parent link is cut while the
// rebound parameter still points at the node it held.
function parentKind(node: Node): number {
  if (node.parent !== undefined) node = node.parent;
  return node.kind;
}

function parentKindAfterCut(node: Node): number {
  if (node.parent !== undefined) {
    const child = node;
    node = node.parent;
    cut(child);
  }
  const fresh = new Node(100, undefined);
  return node.kind + fresh.kind;
}

interface Inner {
  name: string;
}
interface Outer {
  inner: Inner;
}

// The walk starts at an owned local that is later rebound.
function rebound(seed: string): string {
  let owner: Outer = { inner: { name: seed + "-1" } };
  const inner = owner.inner;
  owner = { inner: { name: seed + "-2" } };
  return inner.name + "/" + owner.inner.name;
}

// Whole-value uses of a walk local still take their own reference.
function rootOrSelf(node: Node): Node {
  let current = node;
  while (current.parent !== undefined) current = current.parent;
  return current;
}

const file = new SourceFile("main.ts");
const other = new SourceFile("other.ts");
const a = new Node(1, file);
const b = new Node(2, a);
const c = new Node(3, b);
const d = new Node(4, other);
console.log(sourceFileOf(c).fileName, sourceFileOf(file).fileName, sourceFileOf(d).fileName);
console.log(depth(c), depth(file), depth(undefined));
console.log(ancestorOfKind(c, 1)?.kind, ancestorOfKind(c, 9)?.kind);
console.log(commonRoot(c, b), commonRoot(c, d));
const held: Node[] = [];
for (let i = 0; i < 3; i++) held.push(rootOrSelf(c));
console.log(held.length, held[0] === file, held[2] === held[1]);

// Chains whose only owners are their own parent links.
function chain(length: number): Node {
  let node: Node = new SourceFile("chain.ts");
  for (let i = 1; i <= length; i++) node = new Node(i, node);
  return node;
}
console.log(sourceFileOf(chain(5)).fileName, depth(chain(7)));
console.log(cutWalk(chain(6)));
console.log(climb(chain(4), 2), climb(chain(4), 10));
console.log(rebound("x"));
console.log(parentKind(chain(3)), parentKind(file), parentKindAfterCut(chain(3)), parentKindAfterCut(chain(1)));
