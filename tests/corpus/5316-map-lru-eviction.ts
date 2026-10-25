// A least-recently-used cache over Map insertion order: a hit moves the
// key to the end (delete + set) and eviction removes the oldest key,
// taken both through keys().next() and through a for-of that breaks.
class Lru {
  private readonly items = new Map<string, number>();
  private readonly limit: number;
  constructor(limit: number) {
    this.limit = limit;
  }
  get(key: string): number | undefined {
    const value = this.items.get(key);
    if (value !== undefined) {
      this.items.delete(key);
      this.items.set(key, value);
    }
    return value;
  }
  put(key: string, value: number, viaLoop: boolean): string | undefined {
    if (this.items.has(key)) this.items.delete(key);
    this.items.set(key, value);
    if (this.items.size <= this.limit) return undefined;
    let oldest: string | undefined;
    if (viaLoop) {
      for (const k of this.items.keys()) {
        oldest = k;
        break;
      }
    } else {
      oldest = this.items.keys().next().value;
    }
    if (oldest !== undefined) this.items.delete(oldest);
    return oldest;
  }
  keys(): string {
    return [...this.items.keys()].join(",");
  }
}

let seed = 17;
function next(): number {
  seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
  return seed % 23;
}
for (const viaLoop of [false, true]) {
  const cache = new Lru(5);
  const evicted: string[] = [];
  let hits = 0;
  for (let i = 0; i < 2000; i++) {
    const key = "k" + next();
    if (cache.get(key) !== undefined) hits++;
    const gone = cache.put(key, i, viaLoop);
    if (gone !== undefined && evicted.length < 12) evicted.push(gone);
  }
  console.log(viaLoop ? "loop" : "next", hits, cache.keys(), evicted.join(" "));
}
