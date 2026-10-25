// LifetimeRegion (@scriptc/experimental) and weak collections: objects of a
// region can be WeakMap and WeakSet keys. When scriptc frees the region,
// their weak entries go with them, so objects created later (which may
// reuse the freed memory) are never mistaken for the old keys. Node.js
// prints the same.
import type { ProgramLifetime } from "@scriptc/types";
import { LifetimeRegion } from "@scriptc/experimental";

class Node implements ProgramLifetime {
  readonly id: number;
  next: Node | undefined = undefined;
  constructor(id: number) {
    this.id = id;
  }
}

const visits = new WeakMap<Node, number>();
const marked = new WeakSet<Node>();

function generation(gen: number): string {
  const region = new LifetimeRegion();
  const nodes = region.run(() => {
    const list: Node[] = [];
    for (let i = 0; i < 50; i++) {
      const n = new Node(gen * 100 + i);
      if (i > 0) n.next = list[i - 1];
      list.push(n);
    }
    return list;
  });
  let fresh = 0;
  for (const n of nodes) {
    // A node of this generation was never seen before.
    if (!visits.has(n) && !marked.has(n)) fresh++;
    visits.set(n, (visits.get(n) ?? 0) + 1);
    if (n.id % 3 === 0) marked.add(n);
  }
  let hits = 0;
  for (const n of nodes) hits += visits.get(n)!;
  const summary = `gen ${gen}: fresh ${fresh} hits ${hits} marked ${nodes.filter((n) => marked.has(n)).length}`;
  region.release();
  return summary;
}

for (let gen = 0; gen < 5; gen++) console.log(generation(gen));
