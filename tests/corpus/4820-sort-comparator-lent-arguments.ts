// Comparator sorts lend each element to the comparator for the call: the
// sort's own storage keeps every element alive, even when the comparator
// rewrites, truncates or refills the array being sorted, keeps arguments
// in outer storage, returns them through closures, or throws.
interface Item {
  id: number;
  label: string;
  tags: string[];
}

function item(id: number, label: string): Item {
  return { id, label, tags: [label + "#" + id] };
}

function makeItems(n: number): Item[] {
  const out: Item[] = [];
  let s = 17;
  for (let i = 0; i < n; i++) {
    s = (s * 1103515245 + 12345) % 2147483648;
    out.push(item(s % 97, "item" + (s % 13)));
  }
  return out;
}

function show(label: string, items: readonly Item[]): void {
  console.log(label, items.map((x) => `${x.id}:${x.label}:${x.tags[0]}`).join(" "));
}

// 1. The comparator overwrites and truncates the array it is sorting.
const victims = makeItems(24);
let rewrites = 0;
victims.sort((a, b) => {
  if (rewrites < 30) {
    victims[rewrites % victims.length] = item(1000 + rewrites, "fresh");
    rewrites++;
  }
  if (rewrites === 20) victims.length = 3;
  return a.id - b.id || a.label.localeCompare(b.label);
});
show("rewritten", victims);

// 2. Arguments kept in outer storage outlive the sort. Every element is
// compared at least once, whatever order the sort compares them in.
const kept = new Set<Item>();
const sample = makeItems(16);
sample.sort((a, b) => {
  kept.add(a);
  kept.add(b);
  return b.id - a.id;
});
sample.length = 0;
show("kept", [...kept].sort((a, b) => a.id - b.id || a.label.localeCompare(b.label)));

// 3. Arguments escaping through closures and returned results.
const later: (() => string)[] = [];
const escaping = makeItems(12);
escaping.sort((a, b) => {
  later.push(() => a.label + "/" + a.tags.join(","));
  later.push(() => b.label + "/" + b.tags.join(","));
  return a.label < b.label ? -1 : a.label > b.label ? 1 : a.id - b.id;
});
escaping.splice(0, escaping.length);
console.log("closures", [...new Set(later.map((f) => f()))].sort().join(" "));

// 4. A comparator that rebinds a parameter owns what it assigns.
const rebound = makeItems(10);
rebound.sort((a, b) => {
  if (a.id > 50) a = item(a.id, a.label + "'");
  return a.id - b.id;
});
show("rebound", rebound);

// 5. A throwing comparator leaves the array as it was.
const throwing = makeItems(10);
let calls = 0;
try {
  throwing.sort((a, b) => {
    if (++calls === 7) throw new Error("stop with " + typeof a.id + " " + b.label.length);
    return a.id - b.id;
  });
} catch (e) {
  console.log("caught", (e as Error).message);
}
show("after throw", throwing);

// 6. Declared functions, toSorted, string and nested-array elements.
function byLabelThenId(a: Item, b: Item): number {
  return a.label.localeCompare(b.label) || a.id - b.id;
}
const original = makeItems(14);
const sorted = original.toSorted(byLabelThenId);
original.fill(item(0, "zero"));
show("toSorted", sorted);
show("filled", original.slice(0, 2));

const words = ["pear", "fig", "apple", "kiwi", "banana", "cherry", "date"].map((w) => w + "-" + w.length);
let longest = "";
words.sort((a, b) => {
  for (const w of [a, b]) if (w.length > longest.length || (w.length === longest.length && w > longest)) longest = w;
  return a.length - b.length || (a < b ? -1 : a > b ? 1 : 0);
});
words.length = 0;
console.log("words", longest, words.length);

const rows = [[3, 1], [1, 2, 3], [2], [9, 9, 9, 9], []].map((r) => r.slice());
const seen = new Set<number[]>();
rows.sort((a, b) => {
  seen.add(a);
  seen.add(b);
  return a.length - b.length;
});
rows.length = 0;
console.log("rows", JSON.stringify([...seen].sort((a, b) => a.length - b.length)));

// 7. Comparators built by a factory capture an unchanged parameter.
function compareBy(keys: string[]): (a: Item, b: Item) => number {
  return (a, b) => {
    for (const key of keys) {
      let d = 0;
      if (key === "label") d = a.label < b.label ? -1 : a.label > b.label ? 1 : 0;
      else if (key === "tag") d = a.tags[0]!.localeCompare(b.tags[0]!);
      else d = a.id - b.id;
      if (d !== 0) return d;
    }
    return 0;
  };
}
const byKeys = compareBy(["label", "tag", "id"]);
const multi = makeItems(18);
multi.sort(byKeys);
show("by keys", multi);
console.log("reuse", makeItems(6).sort(byKeys).map((x) => x.id).join(","));
