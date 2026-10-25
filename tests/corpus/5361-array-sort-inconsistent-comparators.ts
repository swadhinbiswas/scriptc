// Comparators that are not consistent orderings (contradictory answers,
// NaN, only 0 and 1, one parameter, no parameters) give Node's result,
// because the sort makes Node's comparisons in Node's order.
interface Item {
  id: number;
  v: number;
}
let seed = 7;
function random(): number {
  seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
  return seed / 4294967296;
}
function items(n: number): Item[] {
  const out: Item[] = [];
  for (let i = 0; i < n; i++) out.push({ id: i, v: Math.floor(random() * 50) });
  return out;
}
const comparators: [string, (x: Item, y: Item) => number][] = [
  ["contradictory", (x, y) => ((x.id * 7 + y.id * 13) % 5) - 2],
  ["nan-on-ties", (x, y) => (x.v === y.v ? NaN : x.v - y.v)],
  ["zero-or-one", (x, y) => (x.v > y.v ? 1 : 0)],
  ["minus-one-or-zero", (x, y) => (x.v < y.v ? -1 : 0)],
  ["first-only", (x) => (x.v % 3) - 1],
  ["constant", () => 0],
  ["always-negative", () => -1],
  ["random", () => random() - 0.5],
];
for (const n of [2, 7, 40, 70, 300, 2000]) {
  const input = items(n);
  const line: string[] = [];
  for (const [name, cmp] of comparators) {
    let calls = 0;
    const sorted = input.slice().sort((x, y) => {
      calls++;
      return cmp(x, y);
    });
    line.push(`${name}=${calls}:${sorted.slice(0, 12).map((item) => item.id).join(",")}`);
  }
  console.log(n, line.join(" "));
}

const words = ["pear", "fig", "apple", "kiwi", "date", "plum", "lime", "sloe", "yuzu", "nut"];
for (let round = 0; round < 3; round++) {
  const list: string[] = [];
  for (let i = 0; i < 90; i++) list.push(words[Math.floor(random() * words.length)]! + (i % 4));
  console.log(list.slice().sort((a, b) => (a.length > b.length ? 1 : a.length < b.length ? 0 : a < b ? 1 : -1)).join(" "));
  console.log(list.toSorted((a, b) => a.charCodeAt(round) - b.charCodeAt(round + 1)).join(" "));
}
