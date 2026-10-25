// Cycles through arrays: a tree whose children list holds an ancestor and
// itself, and records reached twice through different arrays.
interface Tree {
  label: string;
  children: Tree[];
}
const root: any = { label: "root" };
const leaf: any = { label: "leaf" };
root.children = [leaf, root];
leaf.children = [root];
const tree = root as Tree;
console.log(tree.label, tree.children.length, tree.children[1] === tree);
console.log(tree.children[0].children[0] === tree, tree.children[0].label);

interface Graph {
  nodes: Tree[];
  edges: Tree[][];
}
const x: any = { label: "x" };
const y: any = { label: "y", children: [x] };
x.children = [y];
const graph: any = { nodes: [x, y], edges: [[x, y] as unknown[], [y, x] as unknown[]] };
const g = graph as Graph;
console.log(g.nodes[0] === g.edges[0][0], g.edges[1][1] === g.nodes[0], g.nodes[1].children[0] === g.nodes[0]);
