// push() of a value that may be a hole or missing read appends directly to
// the receiver: present values take the ordinary append, missing ones a
// present-undefined slot. Holes, lengths, return values, evaluation order,
// and reference counts must match Node.

class Item {
  readonly id: number;
  readonly label: string;
  constructor(id: number, label: string) {
    this.id = id;
    this.label = label;
  }
}

function describe(items: readonly Item[]): string {
  const parts: string[] = [];
  for (let i = 0; i < items.length; i++) {
    parts.push(i in items ? (items[i] === undefined ? "undef" : items[i]!.label) : "hole");
  }
  return `${items.length}:[${parts.join(",")}]`;
}

const a = new Item(1, "a");
const b = new Item(2, "b");
const c = new Item(3, "c");

// for-of observes holes as undefined; pushing them stores present undefined.
const sparse: Item[] = [a];
sparse[3] = b;
sparse.push(c);
const copied: Item[] = [];
let lengths = 0;
for (const item of sparse) lengths += copied.push(item);
console.log("for-of copy", describe(copied), lengths, 1 in copied, 2 in copied);

// The filterType shape: keep the constituents a predicate accepts.
function filterItems(items: Item[], keep: (item: Item) => boolean): Item[] {
  const kept: Item[] = [];
  for (const item of items) if (keep(item)) kept.push(item);
  return kept;
}
const many: Item[] = [];
for (let i = 0; i < 40; i++) many.push(new Item(i, "i" + i));
const evens = filterItems(many, (item) => item.id % 2 === 0);
console.log("filtered", evens.length, evens[0]!.label, evens[19]!.label);

// Unchecked indexed reads past the end or into holes are missing values.
const source: Item[] = [a, b];
source[4] = c;
const reads: Item[] = [];
for (let i = 0; i < 6; i++) reads.push(source[i]);
console.log("reads", describe(reads));

// Several arguments: all evaluate before the first append, left to right.
const multi: Item[] = [c];
const pushed = multi.push(source[2], source[0], source[9], source[4]);
console.log("multi", pushed, describe(multi));

// Arguments that reassign or mutate the receiver: the receiver evaluated
// first keeps receiving the appends; the length is read after the values.
let target: Item[] = [a];
const first = target;
const second: Item[] = [];
const ret = target.push(source[3], ((target = second), source[1]));
console.log("reassigned", ret, describe(first), describe(second), target === second);
const shrinking: Item[] = [a, b, c];
const ret2 = shrinking.push(source[5], ((shrinking.length = 1), source[0]));
console.log("shrunk", ret2, describe(shrinking));

// Numbers and strings through the same path.
const nums: number[] = [1, 2];
nums[5] = 6;
const numCopy: number[] = [];
for (const n of nums) numCopy.push(n);
console.log("nums", numCopy.length, JSON.stringify(numCopy), 3 in numCopy);
const words: string[] = ["x"];
words[2] = "z";
const wordCopy: string[] = [];
for (const w of words) wordCopy.push(w);
console.log("words", wordCopy.length, JSON.stringify(wordCopy), 1 in wordCopy);

// Values pushed from a source that is dropped stay alive in the copy.
function detach(): Item[] {
  const temp: Item[] = [new Item(7, "seven"), new Item(8, "eight")];
  const out: Item[] = [];
  for (const item of temp) out.push(item);
  temp.length = 0;
  return out;
}
const detached = detach();
console.log("detached", describe(detached), detached[1]!.id);

// A field receiver and a field value.
class Holder {
  list: Item[] = [];
  pending: Item[] = [b];
}
const holder = new Holder();
holder.pending[2] = c;
for (let i = 0; i < 4; i++) holder.list.push(holder.pending[i]);
console.log("holder", describe(holder.list));
