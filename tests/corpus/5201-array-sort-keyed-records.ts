// Comparators over one number field of records and class instances
// (`a.k - b.k`, `b.k - a.k`, three-way ternaries) sort by key: the stable
// order of equal keys, NaN and -0 keys, aliases and holes match Node.
interface Row {
  id: number;
  key: number;
  label: string;
}

class Item {
  id: number;
  rank: number;
  constructor(id: number, rank: number) {
    this.id = id;
    this.rank = rank;
  }
}

class Special extends Item {
  note: string;
  constructor(id: number, rank: number, note: string) {
    super(id, rank);
    this.note = note;
  }
}

let seed = 7;
function random(): number {
  seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
  return seed / 4294967296;
}

function ids(rows: { id: number }[]): string {
  let hash = 0;
  for (const row of rows) hash = (Math.imul(hash, 31) + row.id) | 0;
  return rows.length + ":" + hash;
}

function makeRows(n: number, key: (i: number) => number): Row[] {
  const rows: Row[] = [];
  for (let i = 0; i < n; i++) rows.push({ id: i, key: key(i), label: "r" + i });
  return rows;
}

const keys: [string, (n: number, i: number) => number][] = [
  ["ties", () => Math.floor(random() * 10)],
  ["ints", () => Math.floor(random() * 100000) - 50000],
  ["doubles", () => (random() - 0.5) * 1e9],
  ["presorted", (n, i) => i],
  ["reversed", (n, i) => n - i],
  ["ties-reversed", (n, i) => Math.floor((n - i) / 4)],
  ["runs", (n, i) => i % Math.ceil(n / 3)],
  ["infinities", (n, i) => (i % 9 === 0 ? Infinity : i % 4 === 0 ? -Infinity : i % 6)],
];
for (const [label, keyFor] of keys) {
  const parts: string[] = [];
  for (const n of [0, 1, 2, 5, 16, 33, 48, 49, 200, 5000]) {
    const rows = makeRows(n, (i) => keyFor(n, i));
    const ascending = rows.toSorted((a, b) => a.key - b.key);
    const descending = rows.toSorted((a, b) => b.key - a.key);
    const ternary = rows.toSorted((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
    const reversed = rows.toSorted((a, b) => (a.key > b.key ? -1 : a.key < b.key ? 1 : 0));
    const inPlace = rows.slice();
    inPlace.sort((p, q) => q.key - p.key);
    parts.push([ids(ascending), ids(descending), ids(ternary), ids(reversed), ids(inPlace)].join("/"));
  }
  console.log(label, parts.join(" "));
}

// Equal keys keep their original order in both directions.
const small = makeRows(12, (i) => [3, 1, 2, 1, 3, 0, 2, 1, 0, 3, 2, 1][i]!);
console.log(small.toSorted((a, b) => a.key - b.key).map((r) => r.label).join(","));
console.log(small.toSorted((a, b) => b.key - a.key).map((r) => r.label).join(","));

// -0 and NaN keys sort through the comparator.
const zeroRows = makeRows(60, (i) => (i % 3 === 0 ? -0 : i % 3 === 1 ? 0 : i % 5));
console.log(zeroRows.toSorted((a, b) => a.key - b.key).map((r) => r.id).join(","));
const nanRows = makeRows(9, (i) => [4, NaN, 2, 7, NaN, 1, 0, 3, 5][i]!);
console.log(nanRows.toSorted((a, b) => a.key - b.key).map((r) => r.id).join(","));
console.log(nanRows.toSorted((a, b) => b.key - a.key).map((r) => r.id).join(","));

// sort keeps the receiver's identity; aliases observe the order.
const shared = makeRows(40, () => Math.floor(random() * 6));
const alias = shared;
const result = shared.sort((a, b) => a.key - b.key);
console.log(result === shared, ids(alias), alias[0]!.label, alias[39]!.label);
shared[0]!.label = "changed";
console.log(alias[0]!.label);

// Class instances, including subclass instances in a base-class array.
const items: Item[] = [];
const specials: Special[] = [];
for (let i = 0; i < 300; i++) {
  const rank = Math.floor(random() * 20);
  if (i % 4 === 0) {
    const special = new Special(i, rank, "s" + i);
    specials.push(special);
    items.push(special);
  } else items.push(new Item(i, rank));
}
console.log(ids(items.toSorted((a, b) => a.rank - b.rank)), ids(items.toSorted((a, b) => b.rank - a.rank)));
specials.sort((a, b) => (a.rank < b.rank ? -1 : a.rank > b.rank ? 1 : 0));
console.log(ids(specials), specials[0]!.note, specials[specials.length - 1]!.note);
items.sort((a, b) => b.rank - a.rank);
console.log(ids(items), items[0]!.rank, items[299]!.rank);

// Holes take the snapshot path.
const holes: Row[] = makeRows(6, (i) => 6 - i);
holes[9] = { id: 99, key: -5, label: "late" };
holes[7] = { id: 77, key: 3, label: "mid" };
holes.sort((a, b) => a.key - b.key);
console.log(holes.length, holes.map((r) => r.id).join(","), 7 in holes, 8 in holes);
const holeCopy: Row[] = [];
holeCopy[4] = { id: 4, key: 1, label: "d" };
holeCopy[0] = { id: 0, key: 0, label: "a" };
holeCopy[2] = { id: 2, key: 1, label: "c" };
const holeSorted = holeCopy.toSorted((a, b) => b.key - a.key);
console.log(holeSorted.length, holeSorted.map((r) => (r === undefined ? "u" : r.id)).join(","));
