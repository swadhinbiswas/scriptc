// LifetimeRegion (@scriptc/experimental) with regions larger than one
// allocation chunk: several ProgramLifetime classes interleave their
// allocations across many chunks, and each generation's region is freed
// when the next one is built. Node.js prints the same.
import type { ProgramLifetime } from "@scriptc/types";
import { LifetimeRegion } from "@scriptc/experimental";

class Leaf implements ProgramLifetime {
  readonly value: number;
  constructor(value: number) {
    this.value = value;
  }
}

class Pair implements ProgramLifetime {
  readonly left: Leaf | Pair;
  readonly right: Leaf | Pair;
  readonly depth: number;
  constructor(left: Leaf | Pair, right: Leaf | Pair, depth: number) {
    this.left = left;
    this.right = right;
    this.depth = depth;
  }
}

class Tagged implements ProgramLifetime {
  readonly tag: string;
  readonly target: Pair;
  readonly extra: number[];
  constructor(tag: string, target: Pair, n: number) {
    this.tag = tag;
    this.target = target;
    this.extra = [n, n + 1, n + 2];
  }
}

function build(gen: number, count: number): Tagged[] {
  const out: Tagged[] = [];
  let level: (Leaf | Pair)[] = [];
  for (let i = 0; i < count; i++) level.push(new Leaf((i * 7 + gen) % 101));
  let depth = 1;
  while (level.length > 1) {
    const next: (Leaf | Pair)[] = [];
    for (let i = 0; i + 1 < level.length; i += 2) {
      const pair = new Pair(level[i]!, level[i + 1]!, depth);
      next.push(pair);
      if (i % 64 === 0) out.push(new Tagged(`t${depth}-${i}`, pair, i));
    }
    if (level.length % 2 === 1) next.push(level[level.length - 1]!);
    level = next;
    depth++;
  }
  return out;
}

function sum(node: Leaf | Pair): number {
  return node instanceof Leaf ? node.value : sum(node.left) + sum(node.right);
}

let previous: LifetimeRegion | undefined;
for (let gen = 0; gen < 4; gen++) {
  const region = new LifetimeRegion();
  const tags = region.run(() => build(gen, 200000));
  const top = tags[tags.length - 1]!;
  console.log(`gen ${gen}: ${tags.length} tags, top ${top.tag} depth ${top.target.depth} sum ${sum(top.target)} extra ${tags[5]!.extra.join("/")}`);
  previous?.release();
  previous = region;
}
previous?.release();
