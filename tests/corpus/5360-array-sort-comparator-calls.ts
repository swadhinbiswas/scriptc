// Comparator sorts call the comparator in Node's order: for each input
// shape and length, the number of calls, a hash of every (x, y) argument
// pair in call order, and the result order match Node.
interface Item {
  id: number;
  v: number;
}
let seed = 99;
function random(): number {
  seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
  return seed / 4294967296;
}
const shapes: [string, (n: number, i: number) => number][] = [
  ["random", (n) => Math.floor(random() * n)],
  ["few", () => Math.floor(random() * 5)],
  ["ascending", (_, i) => i],
  ["descending", (n, i) => n - i],
  ["sawtooth", (_, i) => i % 37],
  ["nearly", (n, i) => (random() < 0.05 ? Math.floor(random() * n) : i)],
  ["runs", (_, i) => (Math.floor(i / 100) % 2 ? -i : i)],
];
const sizes = [0, 1, 2, 3, 5, 31, 32, 33, 63, 64, 65, 100, 257, 1000, 4099];

function mix(h: number, x: number): number {
  return Math.imul(h ^ x, 16777619) >>> 0;
}
for (const [name, make] of shapes) {
  const line: string[] = [];
  for (const n of sizes) {
    const items: Item[] = [];
    for (let i = 0; i < n; i++) items.push({ id: i, v: make(n, i) });
    let calls = 0;
    let log = 2166136261;
    const sorted = items.slice().sort((x, y) => {
      calls++;
      log = mix(mix(log, x.id), y.id);
      return x.v - y.v;
    });
    let result = 2166136261;
    for (const item of sorted) result = mix(result, item.id);
    // The same values as plain numbers take the number-element path.
    const values: number[] = items.map((item) => item.v * 4096 + item.id);
    let numberCalls = 0;
    let numberLog = 2166136261;
    values.sort((x, y) => {
      numberCalls++;
      numberLog = mix(mix(numberLog, x), y);
      return Math.floor(x / 4096) - Math.floor(y / 4096);
    });
    line.push(`${n}:${calls}/${log.toString(16)}/${result.toString(16)}/${numberCalls}/${numberLog.toString(16)}`);
  }
  console.log(name, line.join(" "));
}
