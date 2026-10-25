// Graphs with parent and sibling back references, dropped repeatedly. Some
// graphs keep one inner node referenced from outside, which keeps its whole
// graph alive through the parent and child links; the rest are garbage.
class GraphNode {
  parent: GraphNode | undefined = undefined;
  children: GraphNode[] = [];
  peer: GraphNode | undefined = undefined;
  value: number;
  constructor(value: number) {
    this.value = value;
  }
}

function build(depth: number, parent: GraphNode | undefined, value: number): GraphNode {
  const node = new GraphNode(value);
  node.parent = parent;
  if (depth > 0) {
    for (let i = 0; i < 3; i++) node.children.push(build(depth - 1, node, value * 3 + i));
    node.children[0]!.peer = node.children[2]!;
    node.children[2]!.peer = node.children[0]!;
  }
  return node;
}

function rootOf(node: GraphNode): GraphNode {
  let at = node;
  while (at.parent !== undefined) at = at.parent;
  return at;
}

function sum(node: GraphNode): number {
  let total = node.value;
  for (const child of node.children) total += sum(child);
  return total;
}

const kept: GraphNode[] = [];
let built = 0;
for (let round = 0; round < 400; round++) {
  const root = build(4, undefined, round);
  built += sum(root);
  if (round % 37 === 0) kept.push(root.children[1]!.children[2]!.children[0]!);
}

let check = 0;
for (const node of kept) {
  const root = rootOf(node);
  check += sum(root) + node.value + (node.parent!.peer === undefined ? 1 : 0);
  check += root.children[0]!.peer === root.children[2]! ? 1 : 0;
}
console.log(built, kept.length, check);
