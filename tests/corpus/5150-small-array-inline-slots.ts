// Empty array literals that are appended to keep their first elements in
// the array's own block. Arrays of every element kind fill that room, grow
// past it, gain holes and present undefined, move through the mutating and
// copying operations, live in class and record fields (appended directly or
// through a local alias), reference each other in cycles, and are seen
// through dynamic views; every result matches JS.
function show(label: string, xs: readonly unknown[]): void {
  const parts: string[] = [];
  for (let i = 0; i < xs.length; i++) parts.push(i in xs ? String(xs[i]) : "_");
  console.log(label, xs.length, parts.join(","));
}

// Fill the inline room, then grow past it one element at a time.
const nums: number[] = [];
for (let i = 0; i < 12; i++) {
  nums.push(i * 1.5);
  if (i === 3 || i === 4 || i === 5 || i === 11) show(`nums${i}`, nums);
}
const words: string[] = [];
words.push("a", "b", "c");
words.unshift("z");
show("words", words);
words.push(...words);
show("words-spread", words);
const flags: boolean[] = [];
for (let i = 0; i < 20; i++) flags.push(i % 3 === 0);
show("flags", flags);
const rows: number[][] = [];
rows.push([1], [2, 3]);
rows[4] = [4];
show("rows", rows);
console.log("rows-in", 2 in rows, 3 in rows, rows[1]!.join("+"));

// Holes, present undefined and the moving operations on small arrays.
const maybe: (number | undefined)[] = [];
maybe.push(1, undefined, 3);
maybe[5] = 6;
show("maybe", maybe);
maybe.splice(1, 1, 7, 8);
show("maybe-splice", maybe);
maybe.reverse();
show("maybe-reverse", maybe);
console.log("maybe-shift", maybe.shift(), maybe.pop(), maybe.length);
maybe.length = 2;
show("maybe-truncate", maybe);
const sorted: number[] = [];
sorted.push(5, 3, 9, 1);
sorted.sort((x, y) => x - y);
show("sorted", sorted);
show("sorted-copy", sorted.toSorted((x, y) => y - x).slice(1));
const filled: number[] = [];
filled[2] = 1;
filled.fill(4, 0, 2);
show("filled", filled);
filled.copyWithin(1, 2);
show("copy-within", filled);
const joined: string[] = [];
joined.push("x");
console.log("join", joined.join("-"), [...joined, "y"].join("-"), joined.concat(["q"]).length);

// Fields appended directly and through a local alias; cycles between
// nodes and their edge lists.
class Node {
  readonly edges: Edge[] = [];
  readonly weights: number[] = [];
  readonly id: number;
  constructor(id: number) {
    this.id = id;
  }
}
class Edge {
  readonly to: Node;
  readonly weight: number;
  constructor(to: Node, weight: number) {
    this.to = to;
    this.weight = weight;
  }
}
const nodes: Node[] = [];
for (let i = 0; i < 6; i++) nodes.push(new Node(i));
for (const node of nodes) {
  const weights = node.weights;
  for (let k = 0; k < node.id; k++) {
    node.edges.push(new Edge(nodes[(node.id + k + 1) % nodes.length]!, k));
    weights.push(k * 10);
  }
}
for (const node of nodes) {
  console.log(
    "node",
    node.id,
    node.edges.map((e) => e.to.id).join(""),
    node.weights.join("/"),
  );
}
interface Bag {
  items: string[];
}
const bag: Bag = { items: [] };
const lists: Bag[] = [];
for (let i = 0; i < 3; i++) {
  const b: Bag = { items: [] };
  for (let j = 0; j <= i * 3; j++) b.items.push(`${i}.${j}`);
  lists.push(b);
}
bag.items.push("solo");
console.log("bags", bag.items.join(), lists.map((b) => b.items.length).join());

// Dynamic views read and write the same storage, before and after growth.
const view: number[] = [];
view.push(1, 2);
const anyView = view as any;
anyView[2] = 3;
anyView.push(4);
console.log("view", view.join(), JSON.stringify(anyView), Array.isArray(anyView));
for (let i = 0; i < 6; i++) view.push(i);
console.log("view-grown", anyView.length, anyView[9], JSON.stringify(structuredClone(view)));
const parsed: number[] = JSON.parse("[1,2]") as number[];
parsed.push(3);
console.log("parsed", parsed.join());

// Many short-lived small arrays.
let total = 0;
for (let i = 0; i < 20000; i++) {
  const args: number[] = [];
  for (let j = 0; j < i % 7; j++) args.push(j);
  total += args.length + (args[args.length - 1] ?? 0);
}
console.log("total", total);
