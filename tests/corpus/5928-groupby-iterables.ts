// Object.groupBy and Map.groupBy over Sets, Maps and generators: Sets and
// Maps are walked live, generators are pulled one element per callback and
// closed when a callback throws.
const words = new Set(["aa", "b", "cc", "ddd"]);
console.log(JSON.stringify(Object.groupBy(words, (s) => s.length)));
const byParity = Map.groupBy(new Set([1, 2, 3, 4, 5]), (n, i) => (n + i) % 3);
console.log([...byParity.entries()].map(([k, v]) => `${k}:${v.join("")}`).join(" "));
const prices = new Map<string, number>([["a", 3], ["b", 12], ["c", 7], ["d", 20]]);
const tiers = Object.groupBy(prices, ([, price]) => (price > 10 ? "high" : "low") as string);
console.log(JSON.stringify(tiers));
const live = new Set([1, 2, 3]);
const seen = Map.groupBy(live, (n) => {
  if (n === 1) live.add(4);
  if (n === 2) live.delete(3);
  return n % 2 === 0;
});
console.log(seen.get(true)?.join(","), seen.get(false)?.join(","));
function* gen(): Generator<number> {
  try {
    for (let i = 0; i < 4; i++) {
      console.log("yield", i);
      yield i;
    }
  } finally {
    console.log("gen done");
  }
}
console.log(JSON.stringify(Object.groupBy(gen(), (n) => { console.log("key", n); return (n < 2 ? "small" : "big") as string; })));
try {
  Map.groupBy(gen(), (n) => {
    if (n === 1) throw new Error("stop");
    return n;
  });
} catch (e) {
  console.log("caught", (e as Error).message);
}
console.log(Object.groupBy(new Set<string>(), (s) => s));
