// Cyclic structures in numbers large enough that the cycle collector's
// candidate buffers grow past the size kept between passes: trees with
// parent links that survive several passes (and age into older
// generations) alongside short-lived ones, dropped in waves, then rebuilt
// on the buffers the earlier passes left behind.

class TreeNode {
  parent: TreeNode | undefined = undefined;
  children: TreeNode[] = [];
  readonly id: number;
  constructor(id: number) {
    this.id = id;
  }
}

function buildTree(id: number, width: number, depth: number): TreeNode {
  const root = new TreeNode(id);
  let frontier = [root];
  let next = id + 1;
  for (let d = 0; d < depth; d++) {
    const level: TreeNode[] = [];
    for (const node of frontier)
      for (let w = 0; w < width; w++) {
        const child = new TreeNode(next++);
        child.parent = node;
        node.children.push(child);
        level.push(child);
      }
    frontier = level;
  }
  return root;
}

function size(node: TreeNode): number {
  let n = 1;
  for (const child of node.children) n += size(child);
  return n;
}

function checksum(node: TreeNode): number {
  let sum = node.id % 1000;
  for (const child of node.children) sum = (sum * 31 + checksum(child)) % 1000003;
  return sum;
}

interface Ring {
  label: string;
  next: Ring | undefined;
}

function ring(label: string, length: number): Ring {
  const first: Ring = { label: `${label}0`, next: undefined };
  let last = first;
  for (let i = 1; i < length; i++) {
    const node: Ring = { label: `${label}${i}`, next: undefined };
    last.next = node;
    last = node;
  }
  last.next = first;
  return first;
}

function ringLength(start: Ring): number {
  let n = 1;
  for (let node = start.next; node !== start && node !== undefined; node = node.next) n++;
  return n;
}

for (let round = 0; round < 3; round++) {
  // Long-lived trees: kept across many passes.
  const kept: TreeNode[] = [];
  for (let t = 0; t < 40; t++) kept.push(buildTree(t * 10000, 3, 6));
  let total = 0;
  // Waves of short-lived cyclic garbage while the kept trees age.
  for (let wave = 0; wave < 6; wave++) {
    const rings: Ring[] = [];
    for (let i = 0; i < 6000; i++) rings.push(ring(`w${wave}r${i}-`, 3));
    for (const r of rings) total += ringLength(r);
    const scratch = buildTree(wave, 4, 5);
    total += size(scratch);
  }
  let sum = 0;
  for (const tree of kept) sum = (sum + checksum(tree) + size(tree)) % 1000003;
  // Drop half of the long-lived trees, keep using the rest.
  const survivors = kept.filter((_, i) => i % 2 === 0);
  kept.length = 0;
  for (let wave = 0; wave < 3; wave++) {
    const rings: Ring[] = [];
    for (let i = 0; i < 4000; i++) rings.push(ring(`x${wave}r${i}-`, 4));
    for (const r of rings) total += ringLength(r);
  }
  let survivorSum = 0;
  for (const tree of survivors) {
    survivorSum = (survivorSum + checksum(tree)) % 1000003;
    const leaf = tree.children[1]!.children[2]!;
    survivorSum = (survivorSum + (leaf.parent === tree.children[1] ? 1 : 0)) % 1000003;
  }
  console.log(`round ${round}: total ${total} kept ${sum} survivors ${survivors.length} ${survivorSum}`);
}
