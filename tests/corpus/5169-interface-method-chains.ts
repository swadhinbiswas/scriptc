// Interface methods that return the receiver (fluent chains), call other
// interface methods on themselves and on children (a recursive visitor),
// return promises, and are called from callbacks and generic helpers.
interface Builder {
  add(part: string): Builder;
  build(): string;
}

class Joiner implements Builder {
  parts: string[] = [];
  add(part: string): Builder {
    this.parts.push(part);
    return this;
  }
  build(): string {
    return this.parts.join("-");
  }
}

class Counter implements Builder {
  n = 0;
  add(part: string): Builder {
    this.n += part.length;
    return this;
  }
  build(): string {
    return `${this.n} chars`;
  }
}

const builders: Builder[] = [new Joiner(), new Counter()];
for (const b of builders) console.log(b.add("a").add("bc").add("def").build());

interface Node {
  sum(): number;
  depth(): number;
}

class Leaf implements Node {
  value: number;
  constructor(value: number) {
    this.value = value;
  }
  sum(): number {
    return this.value;
  }
  depth(): number {
    return 1;
  }
}

class Branch implements Node {
  left: Node;
  right: Node;
  constructor(left: Node, right: Node) {
    this.left = left;
    this.right = right;
  }
  sum(): number {
    return this.left.sum() + this.right.sum();
  }
  depth(): number {
    return Math.max(this.left.depth(), this.right.depth()) + 1;
  }
}

const tree: Node = new Branch(
  new Leaf(1),
  new Branch(new Branch(new Leaf(2), new Leaf(3)), { sum: () => 10, depth: () => 7 }),
);
console.log(tree.sum(), tree.depth());

interface Source {
  load(id: number): Promise<string>;
}

class Fast implements Source {
  async load(id: number): Promise<string> {
    return `fast ${id}`;
  }
}

class Slow implements Source {
  load(id: number): Promise<string> {
    return new Promise((resolve) => setTimeout(() => resolve(`slow ${id}`), 1));
  }
}

function total<T extends Node>(nodes: T[]): number {
  return nodes.reduce((acc, node) => acc + node.sum(), 0);
}
console.log(total([new Leaf(5), new Leaf(6)]));

async function main(): Promise<void> {
  const sources: Source[] = [new Fast(), new Slow()];
  const pending: Promise<string>[] = [];
  for (let i = 0; i < sources.length; i++) pending.push(sources[i]!.load(i));
  const results = await Promise.all(pending);
  console.log(results.join(", "));
  for (const s of sources) console.log(await s.load(9));
}
void main();
