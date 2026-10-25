// indexOf and includes on arrays of objects, records, arrays, maps, sets,
// typed arrays and strings: dense arrays, arrays with holes and sparse
// entries (the runtime search), duplicates (the first index), and strings of
// every length class built separately, differing at each position.
class Item {
  id: number;
  constructor(id: number) {
    this.id = id;
  }
}
const items: Item[] = [];
for (let i = 0; i < 37; i++) items.push(new Item(i));
const stranger = new Item(99);
const objectResults: number[] = [];
for (let i = 0; i < 37; i++) objectResults.push(items.indexOf(items[i]!));
objectResults.push(items.indexOf(stranger), items.includes(stranger) ? 1 : 0, items.includes(items[36]!) ? 1 : 0);
items.push(items[5]!);
objectResults.push(items.indexOf(items[5]!), items.lastIndexOf(items[5]!));
console.log(objectResults.join(","));

// Holes and sparse entries.
const holey: Item[] = items.slice(0, 10);
holey.length = 20;
holey[15] = stranger;
console.log(holey.indexOf(stranger), holey.includes(stranger), holey.indexOf(items[3]!), holey.indexOf(items[12]!));
const sparse: Item[] = [items[0]!, items[1]!];
sparse[5000] = stranger;
console.log(sparse.indexOf(stranger), sparse.includes(items[1]!), sparse.indexOf(items[2]!));
const emptied: Item[] = [items[0]!];
emptied.pop();
console.log(emptied.indexOf(items[0]!), emptied.includes(items[0]!), emptied.length);

// Mutation between searches.
const moving = items.slice(0, 8);
moving.shift();
moving.splice(2, 1);
moving.unshift(stranger);
console.log(moving.indexOf(stranger), moving.indexOf(items[0]!), moving.indexOf(items[3]!), moving.indexOf(items[7]!));

// Other reference element kinds.
type Point = { x: number; y: number };
const points: Point[] = [{ x: 1, y: 2 }, { x: 1, y: 2 }];
const p0 = points[0]!;
console.log(points.indexOf(p0), points.indexOf(points[1]!), points.indexOf({ x: 1, y: 2 }), points.includes(p0));
const rows: number[][] = [[1], [2], [1]];
console.log(rows.indexOf(rows[2]!), rows.includes([1]), rows.indexOf(rows[1]!));
const maps: Map<string, number>[] = [new Map(), new Map()];
const sets: Set<number>[] = [new Set([1]), new Set([1])];
const buffers: Uint8Array[] = [new Uint8Array(2), new Uint8Array(2)];
console.log(maps.indexOf(maps[1]!), sets.indexOf(sets[1]!), sets.includes(new Set([1])), buffers.indexOf(buffers[1]!));

// Strings: lengths 0 to 40, each built at run time, differing at each position.
function build(n: number, at: number, ch: string): string {
  let s = "";
  for (let i = 0; i < n; i++) s += i === at ? ch : String.fromCharCode(97 + (i % 26));
  return s;
}
let out = "";
for (let n = 0; n <= 40; n++) {
  const words: string[] = [];
  for (let at = 0; at < n; at++) words.push(build(n, at, "Z"));
  words.push(build(n, -1, ""));
  for (let at = 0; at < n; at++) {
    const probe = build(n, at, "Z");
    out += words.indexOf(probe) === at ? "." : "x";
  }
  out += words.indexOf(build(n, -1, "")) === n ? "." : "x";
  out += words.includes(build(n + 1, -1, "")) ? "x" : ".";
  out += words.indexOf(build(n, n - 1, "Y")) === -1 || n === 0 ? "." : "x";
  out += "|";
}
console.log(out);
const names = ["", "a", "é", "日本", "naïve", "naive", "😀", "abcdefgh", "abcdefghi", "abcdefghabcdefgh", "abcdefghabcdefghX"];
const lookups = names.map((name) => (name + "!").slice(0, name.length));
console.log(lookups.map((name) => names.indexOf(name)).join(","), names.includes("na" + "ïve"), names.indexOf("日"), names.indexOf("abcdefghabcdefgY"));
const dup = ["k", "k", "q", "k"];
console.log(dup.indexOf("k"), dup.indexOf("q"), dup.includes("z"), dup.lastIndexOf("k"));
const holeyNames: string[] = ["a", "b"];
holeyNames[4] = "e";
console.log(holeyNames.indexOf("e"), holeyNames.includes("b"), holeyNames.indexOf("c"));
