// A comparator that throws on its k-th call stops the sort after exactly k
// calls; sort leaves the array as it was and toSorted produces nothing.
interface Item {
  id: number;
  v: number;
}
let seed = 31;
function random(): number {
  seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
  return seed / 4294967296;
}
for (const n of [3, 40, 65, 500]) {
  const base: Item[] = [];
  for (let i = 0; i < n; i++) base.push({ id: i, v: Math.floor(random() * 20) });
  const numbers = base.map((item) => item.v * 1000 + item.id);
  for (const limit of [1, 2, 10, 60, 400, 3000]) {
    const items = base.slice();
    let calls = 0;
    let outcome = "sorted";
    try {
      items.sort((x, y) => {
        if (++calls === limit) throw new Error("stop at " + limit);
        return x.v - y.v;
      });
    } catch (e) {
      outcome = (e as Error).message;
    }
    const unchanged = items.every((item, i) => item === base[i]);
    let copyCalls = 0;
    let copy = "none";
    try {
      copy = numbers
        .toSorted((x, y) => {
          if (++copyCalls === limit) throw new RangeError("copy " + limit);
          return y - x;
        })
        .slice(0, 5)
        .join(",");
    } catch (e) {
      copy = (e as RangeError).name + ":" + (e as RangeError).message;
    }
    console.log(n, limit, calls, outcome, unchanged, items.slice(0, 6).map((item) => item.id).join(","), copyCalls, copy);
  }
}
