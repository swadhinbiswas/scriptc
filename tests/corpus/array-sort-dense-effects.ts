// Comparator side effects and exceptions while sorting dense arrays:
// the comparator observes the unsorted array, writes made by the
// comparator are overwritten by the sorted values, appended indices
// survive, a truncated array regrows, and an exception leaves the array
// as the comparator left it.

function show(values: number[]): string {
  const out: string[] = [];
  for (let i = 0; i < values.length; i++) out.push(i in values ? String(values[i]) : "_");
  return values.length + ":" + out.join(",");
}

// The array stays unsorted while the comparator runs.
const watched = [5, 2, 4, 1, 3];
const seen: string[] = [];
watched.sort((a, b) => {
  if (seen.length === 0) seen.push(watched.join(","));
  return a - b;
});
console.log("observed", seen[0], "after", watched.join(","));

const big: number[] = [];
for (let i = 0; i < 100; i++) big.push((i * 37) % 100);
let firstBig = "";
big.sort((a, b) => {
  if (firstBig === "") firstBig = big.slice(0, 5).join(",");
  return a - b;
});
console.log("observed big", firstBig, big.slice(0, 5).join(","), big[99]);

// Writes from the comparator.
function mutated(label: string, edit: (values: number[]) => void): void {
  const values: number[] = [];
  for (let i = 0; i < 40; i++) values.push((i * 13) % 40);
  let done = false;
  values.sort((a, b) => {
    if (!done) {
      done = true;
      edit(values);
    }
    return a - b;
  });
  console.log(label, show(values));
}
mutated("overwrite", (values) => {
  values[0] = 1000;
  values[39] = -1000;
});
mutated("push", (values) => {
  values.push(77, 88);
});
mutated("truncate", (values) => {
  values.length = 3;
});
mutated("clear and grow", (values) => {
  values.length = 0;
  values.push(5);
  values[60] = 6;
});
mutated("lengthen", (values) => {
  values.length = 50;
});
mutated("shift", (values) => {
  values.shift();
});

// Reference elements overwritten or dropped by the comparator stay alive
// in the sort and come back in the result.
class Item {
  key: number;
  label: string;
  constructor(key: number, label: string) {
    this.key = key;
    this.label = label;
  }
}
function items(n: number): Item[] {
  const out: Item[] = [];
  for (let i = 0; i < n; i++) out.push(new Item((i * 7) % n, "i" + i));
  return out;
}
function labels(values: Item[]): string {
  const out: string[] = [];
  for (let i = 0; i < values.length; i++) out.push(i in values ? values[i]!.label : "_");
  return values.length + ":" + out.join(",");
}
for (const n of [5, 30]) {
  const list = items(n);
  let calls = 0;
  list.sort((a, b) => {
    calls++;
    if (calls === 1) {
      list[0] = new Item(-1, "replaced");
      list.length = 2;
      list.push(new Item(-2, "pushed"));
    }
    if (calls === 3) list.length = 0;
    return a.key - b.key;
  });
  console.log("items", n, labels(list));
}

const strings = ["delta", "alpha", "echo", "charlie", "bravo", "foxtrot"];
let first = true;
strings.sort((a, b) => {
  if (first) {
    first = false;
    for (let i = 0; i < strings.length; i++) strings[i] = "x" + i;
    strings.push("tail");
  }
  return a < b ? -1 : a > b ? 1 : 0;
});
console.log("strings", strings.join(","));

// toSorted leaves the receiver alone, whatever the comparator does to it.
const source = [9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
let once = true;
const copy = source.toSorted((a, b) => {
  if (once) {
    once = false;
    source.length = 1;
    source.push(-5);
  }
  return a - b;
});
console.log("toSorted", copy.join(","), "source", source.join(","));

// Exceptions mid-sort.
function thrower(at: number): (a: number, b: number) => number {
  let calls = 0;
  return (a, b) => {
    if (++calls === at) throw new Error("stop at " + at);
    return a - b;
  };
}
for (const at of [1, 5, 40, 200]) {
  const values: number[] = [];
  for (let i = 0; i < 64; i++) values.push((i * 29) % 64);
  const before = values.join(",");
  try {
    values.sort(thrower(at));
    console.log("no throw", at);
  } catch (e) {
    console.log((e as Error).message, values.join(",") === before);
  }
  try {
    values.toSorted(thrower(at));
  } catch (e) {
    console.log("toSorted", (e as Error).message, values.join(",") === before);
  }
}
for (const at of [1, 50]) {
  const list = items(40);
  const before = labels(list);
  let calls = 0;
  try {
    list.sort((a, b) => {
      if (++calls === at) {
        list[3] = new Item(99, "late");
        throw new Error("item stop " + at);
      }
      return a.key - b.key;
    });
  } catch (e) {
    console.log((e as Error).message, labels(list) === before, list[3]!.label);
  }
  const fresh = items(40);
  let count = 0;
  try {
    fresh.toSorted((a, b) => {
      if (++count === at) throw new Error("copy stop " + at);
      return b.key - a.key;
    });
  } catch (e) {
    console.log((e as Error).message, labels(fresh) === labels(items(40)));
  }
}
