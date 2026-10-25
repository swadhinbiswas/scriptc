type Entry = { key: number; order: number; label: string };

function check(entries: Entry[]): void {
  const before = entries.map(entry => entry.order).join(",");
  const sorted = entries.toSorted((a, b) => a.key - b.key);
  for (let i = 1; i < sorted.length; i++) {
    const previous = sorted[i - 1]!;
    const current = sorted[i]!;
    if (previous.key > current.key || (previous.key === current.key && previous.order > current.order)) {
      throw new Error("unstable ordering");
    }
  }
  if (before !== entries.map(entry => entry.order).join(",")) throw new Error("source changed");
  const same = entries.sort((a, b) => a.key - b.key);
  console.log(same === entries, sorted.map(entry => entry.label).join(",") === entries.map(entry => entry.label).join(","));
  console.log(sorted.map(entry => entry.order).join(","));
  if (sorted.length > 0) {
    sorted[0]!.label = "shared";
    console.log(entries[0]!.label);
  }
}

for (const size of [0, 1, 2, 15, 16, 17, 31, 32, 33, 65, 127, 257]) {
  const entries: Entry[] = [];
  for (let i = 0; i < size; i++) entries.push({ key: (i * 97) % 23, order: i, label: String(i) });
  check(entries);
}

// Descending runs containing ties cannot reverse the equal entries.
const blocks: Entry[] = [];
for (let i = 0; i < 513; i++) {
  blocks.push({ key: 100 - Math.floor(i / 3) % 100, order: i, label: "entry-" + String(i) });
}
check(blocks);

// A throw during a later merge must retain the original array and every
// referenced record, including values previously held in the scratch array.
const throwing: Entry[] = [];
for (let i = 0; i < 257; i++) throwing.push({ key: (i * 73) % 257, order: i, label: String(i) });
let comparisons = 0;
try {
  throwing.sort((a, b) => {
    comparisons++;
    if (comparisons === 700) throw new Error("stop");
    return a.key - b.key;
  });
} catch (error) {
  console.log(error instanceof Error, throwing.length, throwing[0]!.label, throwing[256]!.label);
}

const words: string[] = [];
for (let i = 0; i < 97; i++) words.push(["a", "\u{10000}", "\ue000", "é", "aa"][i % 5]!);
console.log(words.toSorted().join("|"));

const sparse: (Entry | undefined)[] = [];
for (let i = 0; i < 97; i++) {
  if (i % 3 !== 0) sparse[i] = { key: (i * 29) % 97, order: i, label: String(i) };
}
sparse[5] = undefined;
sparse[96] = undefined;
let changed = false;
const copied = sparse.toSorted((a, b) => {
  if (a === undefined || b === undefined) throw new Error("undefined comparator argument");
  if (!changed) {
    changed = true;
    sparse.length = 1;
    sparse.push({ key: -1, order: 100, label: "new" });
  }
  return a.key - b.key;
});
let visited = 0;
copied.forEach(() => { visited++; });
console.log(copied.length, visited, copied[0]?.key, copied[96] === undefined);
console.log(sparse.length, sparse[1]?.label);
