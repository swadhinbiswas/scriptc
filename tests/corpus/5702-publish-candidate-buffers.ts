import { publish } from "@scriptc/threads";

// publish() over graphs whose nodes are cycle-collector candidates (every
// node has a parent link). Some graphs are published, some are refused
// because a node holds a function, and some are dropped, with cyclic
// garbage in between so collections run between the publishes. A refused
// graph stays writable, and a published subtree shared with another graph
// rejects writes through either graph. Parsed JSON values are published
// after them.

class TreeNode {
  parent: TreeNode | undefined = undefined;
  readonly children: TreeNode[] = [];
  label: string;
  hook: (() => string) | undefined = undefined;
  constructor(label: string) {
    this.label = label;
  }
}

function tree(label: string, depth: number, parent: TreeNode | undefined): TreeNode {
  const node = new TreeNode(label);
  node.parent = parent;
  if (depth > 0)
    for (let i = 0; i < 3; i++) node.children.push(tree(`${label}.${i}`, depth - 1, node));
  return node;
}

function count(node: TreeNode): number {
  let n = 1;
  for (const child of node.children) n += count(child);
  return n;
}

function churn(rounds: number): number {
  let total = 0;
  for (let i = 0; i < rounds; i++) total += count(tree(`g${i}`, 3, undefined));
  return total;
}

function attempt(what: string, run: () => void): void {
  try {
    run();
    console.log(`${what}: ok`);
  } catch (e) {
    console.log(`${what}: ${(e as Error).name}: ${(e as Error).message}`);
  }
}

const kept: TreeNode[] = [];
const metas: unknown[] = [];
for (let round = 0; round < 6; round++) {
  const a = tree(`a${round}`, 4, undefined);
  const b = tree(`b${round}`, 4, undefined);
  const c = tree(`c${round}`, 3, undefined);
  const shared = tree(`s${round}`, 2, undefined);
  a.children[0]!.children.push(shared);
  b.children.push(shared);
  metas.push(JSON.parse(`{"round":${round},"tags":["x","y"]}`));
  c.children[1]!.children[0]!.hook = () => "hook";
  publish(a);
  attempt(`round ${round} refused`, () => {
    publish(c);
  });
  c.label = `${c.label}!`;
  c.children[1]!.children[0]!.label = "rewritten";
  attempt(`round ${round} shared write`, () => {
    b.children[3]!.children[1]!.label = "changed";
  });
  attempt(`round ${round} own write`, () => {
    b.children[1]!.label = "changed";
    b.children.pop();
  });
  kept.push(a);
  if (round % 2 === 0) kept.push(c);
  console.log(round, count(a), count(b), count(c), c.label, churn(40));
}

let labels = 0;
for (const node of kept) labels += node.label.length + count(node);
console.log("kept", kept.length, labels);
publish(metas);
console.log(JSON.stringify(metas));
attempt("published again", () => {
  publish(kept);
});
attempt("write after", () => {
  kept[0]!.children[1]!.label = "late";
});
console.log(churn(200));
