// Late-dying survivors of the cycle collector.
//
// An object that survives collector passes is promoted until it reaches the
// old generation, which only full passes walk (the live heap grew past the
// old level's fraction, an old backlog built up, or program exit). This
// program builds a tree with parent back edges, keeps it alive across many
// passes so its nodes age into the old generation, and then lets parts of it
// die LATE, as cycles: a detached subtree is held together by its children's
// parent edges, so plain reference counting can never free it. A temporary
// tree held across passes inside a call dies the same way when the call
// returns. Live ballast then grows the heap past the full-pass trigger.
//
// The output pins the surviving structure. The sanitized lane's exit RC audit
// is what proves the late-dying cycles were reclaimed rather than leaked, and
// AddressSanitizer that no pass touched a reclaimed old object.
class TreeNode {
  parent: TreeNode | null = null;
  children: TreeNode[] = [];
  label: string;
  weight: number;
  constructor(label: string, weight: number) {
    this.label = label;
    this.weight = weight;
  }
  add(child: TreeNode): TreeNode {
    child.parent = this;
    this.children.push(child);
    return child;
  }
}

function build(depth: number, fanout: number, prefix: string): TreeNode {
  const node = new TreeNode(prefix, prefix.length);
  if (depth > 0) {
    for (let i = 0; i < fanout; i = i + 1) node.add(build(depth - 1, fanout, `${prefix}.${i}`));
  }
  return node;
}

function count(node: TreeNode): number {
  let n = 1;
  for (const child of node.children) n = n + count(child);
  return n;
}

function total(node: TreeNode): number {
  let sum = node.weight;
  for (const child of node.children) sum = sum + total(child);
  return sum;
}

// Every child must still point at the node that holds it.
function linked(node: TreeNode): boolean {
  for (const child of node.children) {
    if (child.parent !== node || !linked(child)) return false;
  }
  return true;
}

// Dead two-node cycles, to drive collector passes.
function churn(n: number): void {
  for (let i = 0; i < n; i = i + 1) {
    const a = new TreeNode("a", 0);
    a.add(new TreeNode("b", 0));
  }
}

// A temporary tree that stays alive across passes (and ages there),
// then dies as a cycle when the call returns.
function holdAcrossPasses(round: number): number {
  const held = build(3, 3, `tmp${round}`);
  churn(2000);
  return total(held);
}

const root = new TreeNode("root", 1);
for (let i = 0; i < 8; i = i + 1) root.add(build(4, 3, `s${i}`));
for (let round = 0; round < 20; round = round + 1) {
  total(root);
  churn(500);
}
console.log(`built ${count(root)} nodes, weight ${total(root)}, linked ${linked(root)}`);

// Late death: every other subtree is detached and becomes a dead cycle.
const kept: TreeNode[] = [];
for (let i = 0; i < root.children.length; i = i + 1) {
  if (i % 2 === 0) kept.push(root.children[i]);
}
root.children = kept;

let held = 0;
for (let round = 0; round < 5; round = round + 1) held = held + holdAcrossPasses(round);

// Grow the live heap past the full-pass trigger.
const ballast: TreeNode[] = [];
for (let i = 0; i < 150000; i = i + 1) ballast.push(new TreeNode("ballast", i % 7));
let ballastWeight = 0;
for (const node of ballast) ballastWeight = ballastWeight + node.weight;

console.log(`kept ${count(root)} nodes, weight ${total(root)}, linked ${linked(root)}`);
console.log(`held ${held}, ballast ${ballast.length} weighing ${ballastWeight}`);
