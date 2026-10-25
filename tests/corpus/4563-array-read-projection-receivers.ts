// Element reads (`a.items[i]`, `i in a.items`, holes) borrow an array that a
// parameter's or local's field holds while the index cannot remove a
// reference edge. An index whose evaluation replaces or clears the array
// still reads the array the receiver named first, exactly as Node does.

class Cache {
  nodes: string[] = [];
  flags: boolean[] = [];
  types: (number | undefined)[] = [];
  sparse: number[] = [];
}

class Holder {
  cache: Cache;
  constructor(cache: Cache) {
    this.cache = cache;
  }
}

function find(c: Cache, s: string): number {
  for (let i = 0; i < c.nodes.length; i++) if (c.nodes[i] === s && c.flags[i]) return i;
  return -1;
}

function nested(h: Holder, i: number): string {
  return `${h.cache.nodes[i]}:${h.cache.flags[i]}:${h.cache.types[i]}`;
}

let replaced = 0;
function replace(c: Cache): number {
  c.nodes = ["fresh"];
  replaced++;
  return 1;
}

function readBeforeReplace(c: Cache): string {
  // `c.nodes` is evaluated before the index replaces it.
  return c.nodes[replace(c)]!;
}

function holes(c: Cache): string {
  const out: string[] = [];
  for (let i = 0; i < 6; i++) out.push(`${i in c.sparse}/${c.sparse[i] === undefined}`);
  return out.join(",");
}

const cache = new Cache();
for (let i = 0; i < 10; i++) {
  cache.nodes.push(`n${i}`);
  cache.flags.push(i % 3 === 0);
  cache.types.push(i % 4 === 0 ? undefined : i * i);
}
cache.sparse[1] = 10;
cache.sparse[4] = 40;
const holder = new Holder(cache);

console.log(find(cache, "n3"), find(cache, "n4"), find(cache, "missing"));
console.log(nested(holder, 0), nested(holder, 5), nested(holder, 42));
console.log(holes(cache));
console.log(readBeforeReplace(cache), cache.nodes.join("|"), replaced);
let total = 0;
for (let round = 0; round < 1000; round++) total += find(holder.cache, "fresh") + 1;
console.log(total);
