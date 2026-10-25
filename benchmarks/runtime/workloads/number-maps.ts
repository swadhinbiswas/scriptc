// Number-keyed Map and Set work: a node table indexed by dense ids, scope
// tables keyed by sparse ids from one global counter, and caches that mix
// get, has and set on the same keys.
interface Item {
  id: number;
  parent: number;
  flags: number;
}

// Dense ids: items 0..n-1, walked through their parent chains.
function denseIds(n: number, rounds: number): number {
  const items = new Map<number, Item>();
  for (let id = 0; id < n; id++) items.set(id, { id, parent: id === 0 ? -1 : (id * 7) >> 3, flags: id & 15 });
  let total = 0;
  for (let r = 0; r < rounds; r++) {
    for (let id = r & 7; id < n; id += 8) {
      let item = items.get(id);
      let depth = 0;
      while (item !== undefined && depth < 4) {
        total += item.flags;
        item = items.get(item.parent);
        depth++;
      }
    }
  }
  return total;
}

// Sparse ids: one counter hands out ids to many scopes, so each scope's
// keys are spread far apart. Lookups test membership, then read.
function sparseIds(scopes: number, perScope: number, rounds: number): number {
  const tables: Map<number, Item>[] = [];
  const probes: number[] = [];
  let next = 1000;
  for (let s = 0; s < scopes; s++) tables.push(new Map<number, Item>());
  for (let i = 0; i < perScope; i++) {
    for (let s = 0; s < scopes; s++) {
      const id = next;
      next += 1 + ((id * 31) & 3);
      tables[s]!.set(id, { id, parent: s, flags: id & 7 });
      if ((i & 1) === 0) probes.push(id);
      else probes.push(id + 1);
    }
  }
  let total = 0;
  for (let r = 0; r < rounds; r++) {
    for (let p = 0; p < probes.length; p++) {
      const id = probes[p]!;
      const table = tables[p % scopes]!;
      if (table.has(id)) total += table.get(id)!.flags;
      else total++;
    }
  }
  return total;
}

// Mixed get/set: counting relation keys, a memo cache filled on misses,
// and a visited set.
function mixed(ids: number[], rounds: number): number {
  const counts = new Map<number, number>();
  const memo = new Map<number, number>();
  let total = 0;
  for (let r = 0; r < rounds; r++) {
    const visited = new Set<number>();
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i]!;
      const relation = id * 4 + (r & 3);
      counts.set(relation, (counts.get(relation) ?? 0) + 1);
      let cached = memo.get(id);
      if (cached === undefined) {
        cached = (id * 2654435761) % 1000;
        memo.set(id, cached);
      }
      total += cached;
      if (!visited.has(id)) {
        visited.add(id);
        total++;
      }
    }
  }
  return total + counts.size + memo.size;
}

const scale = Number(process.argv[2] ?? "1");
const ids: number[] = [];
for (let i = 0; i < 20000; i++) ids.push(5000 + ((i * 7919) % 12000) * 3);
const dense = denseIds(50000, Math.floor(40 * scale));
const sparse = sparseIds(64, 40, Math.floor(400 * scale));
const mix = mixed(ids, Math.floor(30 * scale));
console.log("dense", dense, "sparse", sparse, "mixed", mix);
