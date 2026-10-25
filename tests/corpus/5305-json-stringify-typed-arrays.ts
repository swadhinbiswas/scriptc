// JSON.stringify of typed values: dense and non-dense arrays of every
// element kind, nested arrays, special numbers, optional and union
// elements, tuples, non-ASCII keys, and output large enough to grow the
// buffer many times.
interface Item {
  sku: string;
  quantity: number;
  price: number;
  flags: boolean[];
}
interface Order {
  id: number;
  "ключ": string;
  "emoji 😀": number;
  items: Item[];
  tags: string[];
  matrix: number[][];
  pair: [string, number];
  maybe: (string | null)[];
  note?: string;
}
interface Tree {
  value: number;
  children: Tree[];
}

let seed = 77;
function random(): number {
  seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
  return seed / 4294967296;
}

function makeOrder(i: number, special: boolean): Order {
  const items: Item[] = [];
  for (let j = 0; j < 1 + (i % 4); j++)
    items.push({
      sku: "sku-" + Math.floor(random() * 50),
      quantity: j,
      price: Math.round(random() * 10000) / 100,
      flags: j % 2 === 0 ? [true, false] : [],
    });
  return {
    id: i,
    "ключ": "значение " + i,
    "emoji 😀": i * 0.5,
    items,
    tags: i % 3 === 0 ? [] : ["a\"b", "tab\there", "ü"],
    matrix: special ? [[i, -0], [NaN, Infinity, -Infinity], []] : [[i, i * 2], []],
    pair: ["p" + i, i / 3],
    maybe: [null, "x", null],
    note: i % 2 === 1 ? "odd" : undefined,
  };
}

// Small values in full.
console.log(JSON.stringify(makeOrder(0, true)));
console.log(JSON.stringify(makeOrder(1, true)));
console.log(JSON.stringify([1, 2.5, -0, NaN, 1e21, 1e-7, -123.456]));
console.log(JSON.stringify([true, false, true]), JSON.stringify([] as number[]), JSON.stringify([[]] as number[][]));
console.log(JSON.stringify(["", "\u0000", " ", "\ud800", "naïve"]));

// Holes, storage-level undefined and sparse tails take the general walk.
const holes: number[] = [1, 2, 3];
holes[6] = 7;
console.log(JSON.stringify(holes));
const strings: string[] = ["a"];
strings[3] = "d";
console.log(JSON.stringify(strings));
const records: Item[] = [];
records[2] = { sku: "late", quantity: 1, price: 2, flags: [] };
console.log(JSON.stringify(records));
const optional: (number | undefined)[] = [1, undefined, 3];
console.log(JSON.stringify(optional));
const shrunk: number[] = [1, 2, 3, 4, 5];
shrunk.length = 2;
console.log(JSON.stringify(shrunk));
const sparse: number[] = [];
sparse[2000000] = 1;
sparse[0] = 5;
const sparseText = JSON.stringify(sparse);
console.log(sparseText.length, sparseText.slice(0, 12), sparseText.slice(-12));

// Large outputs grow the buffer at many different offsets.
const orders: Order[] = [];
for (let i = 0; i < 4000; i++) orders.push(makeOrder(i, false));
const text = JSON.stringify(orders);
let hash = 0;
for (let i = 0; i < text.length; i += 7) hash = (Math.imul(hash, 31) + text.charCodeAt(i)) | 0;
console.log(text.length, hash, text.slice(0, 80));
const parsed = JSON.parse(text) as Order[];
console.log(parsed.length, parsed[3999]!.items.length, parsed[3999]!["ключ"], JSON.stringify(parsed) === text);
for (let size = 0; size < 300; size += 37) {
  const values: number[] = [];
  for (let i = 0; i < size; i++) values.push(i % 5 === 0 ? -i : i / 4);
  console.log(size, JSON.stringify(values).length);
}

// Recursive values: deep arrays of records, and a cycle through an array.
function tree(depth: number): Tree {
  const node: Tree = { value: depth, children: [] };
  if (depth > 0) for (let i = 0; i < 3; i++) node.children.push(tree(depth - 1));
  return node;
}
const deep = JSON.stringify(tree(6));
console.log(deep.length, deep.slice(0, 60));
const root: Tree = { value: 1, children: [] };
root.children.push({ value: 2, children: [root] });
try {
  JSON.stringify(root);
} catch (error) {
  console.log((error as Error).name, (error as Error).message.split("\n")[0]);
}
const shared: Tree = { value: 3, children: [] };
console.log(JSON.stringify({ value: 0, children: [shared, shared] } as Tree));
