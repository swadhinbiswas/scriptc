// Parameters rebound by plain assignments keep borrowing the caller's
// argument; the values the body assigns are owned separately and released
// when rebound again or when the function exits (normally or by throwing).
// Here the rebinding functions also mutate the heap, so an assigned value
// whose other owners disappear must stay alive through the owned slot.

class Node {
  parent: Node | undefined;
  kind: number;
  constructor(kind: number, parent: Node | undefined) {
    this.kind = kind;
    this.parent = parent;
  }
}

class Fresh extends Node {
  regular: Node;
  constructor(kind: number, regular: Node) {
    super(kind, undefined);
    this.regular = regular;
  }
}

const seen: number[] = [];

function related(source: Node, target: Node): boolean {
  if (source instanceof Fresh) source = source.regular;
  if (target instanceof Fresh) target = target.regular;
  seen.push(source.kind * 10 + target.kind);
  return source === target;
}

// The parent's only other owner is the link this function cuts.
function parentAfterCut(node: Node): number {
  const child = node;
  node = node.parent!;
  child.parent = undefined;
  const fresh = new Node(100, undefined);
  return node.kind + fresh.kind;
}

function wrap(node: Node, depth: number): Node {
  for (let i = 1; i <= depth; i++) node = new Node(node.kind + i, node);
  return node;
}

function count(node: Node | undefined): number {
  let n = 0;
  while (node !== undefined) {
    n++;
    seen.push(node.kind);
    node = node.parent;
  }
  return n;
}

function climb(node: Node, limit: number): number {
  while (node.parent !== undefined) {
    if (limit-- === 0) throw new Error("limit " + node.kind);
    seen.push(node.kind);
    node = node.parent;
  }
  return node.kind;
}

function chain(length: number): Node {
  let node = new Node(0, undefined);
  for (let i = 1; i <= length; i++) node = new Node(i, node);
  return node;
}

const base = new Node(1, undefined);
const fresh = new Fresh(2, base);
const other = new Node(3, undefined);
console.log(related(fresh, base), related(base, fresh), related(fresh, other), related(other, other));
console.log(parentAfterCut(chain(2)), parentAfterCut(new Node(9, new Node(8, undefined))));
const wrapped = wrap(chain(1), 3);
console.log(wrapped.kind, count(wrapped), count(undefined));
console.log(climb(chain(3), 10));
try {
  console.log(climb(chain(6), 2));
} catch (e) {
  console.log((e as Error).message);
}
console.log(seen.join(","));
