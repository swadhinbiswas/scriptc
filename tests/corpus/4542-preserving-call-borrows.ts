// Callees proven not to remove heap edges (switch statements, `??`,
// Math.min, instanceof, and virtual calls whose every override preserves)
// let callers pass array elements and field reads without owning them.
// A single mutating override, a mutating callee, or a mutating later
// operand must keep the owned path: the sanitized lane catches a borrow of
// a freed element.

class Node {
  kind: number;
  name: string;
  constructor(kind: number, name: string) {
    this.kind = kind;
    this.name = name;
  }
  weight(): number {
    return this.kind;
  }
}

class Leaf extends Node {
  weight(): number {
    return this.kind * 2;
  }
}

class Branch extends Node {
  children: Node[] = [];
  weight(): number {
    let total = this.kind;
    for (const child of this.children) total += child.weight();
    return total;
  }
}

function describe(n: Node): string {
  switch (n.kind) {
    case 1:
      return "one:" + n.name;
    case 2:
      return "two:" + n.name;
    default:
      return (n instanceof Leaf ? "leaf:" : "node:") + n.name;
  }
}

function compareNames(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const d = a.charCodeAt(i) - b.charCodeAt(i);
    if (d !== 0) return d;
  }
  return a.length - b.length;
}

const ranks = new Map<string, number>();

function compareNodes(a: Node, b: Node): number {
  if (a === b) return 0;
  const r = (ranks.get(a.name) ?? 0) - (ranks.get(b.name) ?? 0);
  if (r !== 0) return r;
  const w = a.weight() - b.weight();
  return w !== 0 ? w : compareNames(a.name, b.name);
}

function search(nodes: readonly Node[], target: Node): number {
  let low = 0;
  let high = nodes.length - 1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const r = compareNodes(nodes[middle]!, target);
    if (r === 0) return middle;
    if (r < 0) low = middle + 1;
    else high = middle - 1;
  }
  return ~low;
}

function insert(nodes: Node[], n: Node): boolean {
  const index = search(nodes, n);
  if (index >= 0) return false;
  nodes.splice(~index, 0, n);
  return true;
}

// A callee that removes the element it was handed: callers must own it.
function takeAndClear(list: Node[], first: Node): string {
  list.length = 0;
  return describe(first) + "/" + list.length;
}

// A subclass whose override drops references: virtual calls through the
// base class can no longer be proven preserving.
class Measured {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
  measure(): number {
    return this.name.length;
  }
}

class Pruning extends Measured {
  owner: Measured[];
  constructor(name: string, owner: Measured[]) {
    super(name);
    this.owner = owner;
  }
  measure(): number {
    this.owner.length = 0;
    return -1;
  }
}

function weigh(n: Measured, label: Measured): string {
  return n.measure() + ":" + label.name;
}

const nodes: Node[] = [];
const names = ["delta", "alpha", "charlie", "bravo", "alpha", "echo"];
names.forEach((name, i) => {
  const n = i % 3 === 0 ? new Leaf(1 + (i % 2), name) : new Node(1 + (i % 2), name);
  ranks.set(name, name.length % 2);
  console.log(name, insert(nodes, n));
});
console.log(nodes.map(describe).join(" "));
const branch = new Branch(3, "root");
branch.children.push(nodes[0]!, nodes[1]!);
console.log(describe(branch), branch.weight(), search(nodes, nodes[2]!), search(nodes, branch));

const temp = [new Node(1, "temp"), new Leaf(2, "temp2")];
console.log(takeAndClear(temp, temp[0]!));

const owned: Measured[] = [new Measured("kept")];
const pruning = new Pruning("pruner", owned);
const mixed: Measured[] = [pruning, new Measured("plain")];
console.log(weigh(mixed[0]!, owned[0]!), owned.length);
console.log(weigh(mixed[1]!, mixed[1]!));

// A later operand that mutates the array the earlier element came from.
const shrinking = [new Node(1, "first"), new Node(2, "second")];
console.log(
  compareNames(
    shrinking[0]!.name,
    ((shrinking.length = 0), "z"),
  ),
  shrinking.length,
);
