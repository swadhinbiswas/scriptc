// Object graphs with back references, built and dropped: trees whose nodes
// point to their parent and siblings, rings of records that share a
// long-lived registry, and closures that capture the object that holds them.
// Dropping each graph leaves only cyclic references, so the cycle collector
// reclaims it.

class TreeNode {
  parent: TreeNode | undefined = undefined;
  children: TreeNode[] = [];
  sibling: TreeNode | undefined = undefined;
  weight: number;
  constructor(weight: number) {
    this.weight = weight;
  }
}

function buildTree(depth: number, parent: TreeNode | undefined, weight: number): TreeNode {
  const node = new TreeNode(weight);
  node.parent = parent;
  if (depth > 0) {
    for (let i = 0; i < 3; i++) node.children.push(buildTree(depth - 1, node, weight * 3 + i));
    node.children[0]!.sibling = node.children[1]!;
    node.children[1]!.sibling = node.children[2]!;
    node.children[2]!.sibling = node.children[0]!;
  }
  return node;
}

function treeWeight(node: TreeNode): number {
  let total = node.weight;
  for (const child of node.children) total += treeWeight(child);
  return total % 1000003;
}

class Category {
  members = 0;
  name: string;
  constructor(name: string) {
    this.name = name;
  }
}

class Member {
  next: Member | undefined = undefined;
  category: Category;
  rank: number;
  constructor(category: Category, rank: number) {
    this.category = category;
    this.rank = rank;
    category.members++;
  }
}

function buildRing(categories: Category[], size: number, seed: number): Member {
  const first = new Member(categories[seed % categories.length]!, seed);
  let last = first;
  for (let i = 1; i < size; i++) {
    const member = new Member(categories[(seed + i * 7) % categories.length]!, seed + i);
    last.next = member;
    last = member;
  }
  last.next = first;
  return first;
}

class Widget {
  label: string;
  onChange: (() => number) | undefined = undefined;
  constructor(label: string) {
    this.label = label;
  }
}

function buildWidgets(count: number): number {
  const widgets: Widget[] = [];
  for (let i = 0; i < count; i++) {
    const widget = new Widget(`w${i}`);
    widget.onChange = () => widget.label.length + i;
    widgets.push(widget);
  }
  let total = 0;
  for (const widget of widgets) total += widget.onChange!();
  return total;
}

const scale = Number(process.argv[2] ?? "1");
const categories: Category[] = [];
for (let i = 0; i < 32; i++) categories.push(new Category(`category-${i}`));

let trees = 0;
for (let round = 0; round < 1500 * scale; round++) trees = (trees + treeWeight(buildTree(5, undefined, round))) % 1000003;

let rings = 0;
for (let round = 0; round < 4000 * scale; round++) rings += buildRing(categories, 40, round).next!.rank;

let widgets = 0;
for (let round = 0; round < 600 * scale; round++) widgets += buildWidgets(100);

let members = 0;
for (const category of categories) members += category.members;
console.log(`trees ${trees}`);
console.log(`rings ${rings}`);
console.log(`widgets ${widgets}`);
console.log(`members ${members}`);
