// Cycle-capable objects of many types share one compact header that names
// each type by an id assigned on its first allocation. Several worker
// threads allocate their first objects of the same types at the same time;
// cycles of every shape are built, kept, broken and dropped across the
// collector's generations; and the survivors are checked on every thread.
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";

class Ring {
  next: Ring | null = null;
  readonly id: number;
  constructor(id: number) {
    this.id = id;
  }
}
class Pair {
  other: Pair | null = null;
  value: number;
  constructor(value: number) {
    this.value = value;
  }
}
class Graph {
  readonly nodes: GraphNode[] = [];
}
class GraphNode {
  readonly edges: GraphEdge[] = [];
  owner: Graph | null = null;
  readonly label: string;
  constructor(label: string) {
    this.label = label;
  }
}
class GraphEdge {
  readonly to: GraphNode;
  readonly weight: number;
  constructor(to: GraphNode, weight: number) {
    this.to = to;
    this.weight = weight;
  }
}
interface Cell {
  value: number;
  next: Cell | null;
  link: (() => number) | null;
}

function ring(size: number, base: number): Ring {
  const first = new Ring(base);
  let last = first;
  for (let i = 1; i < size; i++) {
    const node = new Ring(base + i);
    last.next = node;
    last = node;
  }
  last.next = first;
  return first;
}

function ringSum(start: Ring): number {
  let sum = start.id;
  for (let at = start.next; at !== null && at !== start; at = at.next) sum += at.id;
  return sum;
}

function graph(n: number, seed: number): Graph {
  const g = new Graph();
  for (let i = 0; i < n; i++) {
    const node = new GraphNode(`n${i}`);
    node.owner = g;
    g.nodes.push(node);
  }
  let x = seed;
  for (const node of g.nodes) {
    for (let k = 0; k < 3; k++) {
      x = (Math.imul(x, 1103515245) + 12345) >>> 0;
      node.edges.push(new GraphEdge(g.nodes[x % n]!, x % 17));
    }
  }
  return g;
}

function graphWeight(g: Graph): number {
  let total = 0;
  for (const node of g.nodes) for (const edge of node.edges) total += edge.weight + edge.to.label.length;
  return total;
}

function cells(n: number): Cell {
  const head: Cell = { value: 0, next: null, link: null };
  let at = head;
  for (let i = 1; i < n; i++) {
    const cell: Cell = { value: i, next: null, link: null };
    cell.link = () => cell.value + head.value;
    at.next = cell;
    at = cell;
  }
  at.next = head;
  return head;
}

function work(tag: number): string {
  const kept: Ring[] = [];
  const pairs: Pair[] = [];
  let dropped = 0;
  for (let round = 0; round < 40; round++) {
    // Garbage rings, pairs and graphs; every few rounds one survives.
    const r = ring(5 + (round % 7), round * 100 + tag);
    dropped += ringSum(r);
    if (round % 9 === 0) kept.push(r);
    const a = new Pair(round);
    const b = new Pair(-round);
    a.other = b;
    b.other = a;
    if (round % 13 === 0) pairs.push(a);
    dropped += graphWeight(graph(30 + round, round + tag));
    const c = cells(8);
    let links = 0;
    for (let at = c.next; at !== c && at !== null; at = at.next) links += at.link!();
    dropped += links;
  }
  // Break one kept ring and drop it; the rest must survive the passes.
  kept[0]!.next = null;
  kept.shift();
  let survivors = 0;
  for (const r of kept) survivors += ringSum(r);
  let pairSum = 0;
  for (const p of pairs) pairSum += p.value + p.other!.value + p.other!.other!.value;
  return `tag ${tag} dropped ${dropped} kept ${kept.length} survivors ${survivors} pairs ${pairSum}`;
}

if (isMainThread) {
  const results: Promise<string>[] = [];
  for (let t = 1; t <= 3; t++) {
    results.push(
      new Promise<string>((resolve) => {
        const worker = new Worker(new URL(import.meta.url), { workerData: t });
        worker.on("message", (text: string) => resolve(text));
      }),
    );
  }
  console.log("main", work(0));
  for (const text of await Promise.all(results)) console.log("worker", text);
  console.log("main again", work(9));
} else {
  parentPort!.postMessage(work(workerData as number));
}
