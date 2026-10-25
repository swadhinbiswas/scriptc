// splice() inserting one value that may be a hole or missing read: present
// values insert as themselves, missing ones as present undefined, in
// statement position and when the removed elements are used. Evaluation
// order and reference lifetimes must match Node.

class Sig {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
}

function show(list: readonly Sig[]): string {
  const parts: string[] = [];
  for (let i = 0; i < list.length; i++) {
    parts.push(i in list ? (list[i] === undefined ? "undef" : list[i]!.name) : "hole");
  }
  return `${list.length}:[${parts.join(",")}]`;
}

// The reorderCandidates shape: insert each candidate at a computed index.
const candidates: Sig[] = [new Sig("a"), new Sig("b")];
candidates[3] = new Sig("d");
candidates.push(new Sig("e"));
const ordered: Sig[] = [];
let index = 0;
for (const sig of candidates) {
  ordered.splice(index % 2 === 0 ? 0 : ordered.length, 0, sig);
  index++;
}
console.log("ordered", show(ordered));

// Unchecked reads as items, replacing and removing.
const source: Sig[] = [new Sig("s0")];
source[2] = new Sig("s2");
const target: Sig[] = [new Sig("t0"), new Sig("t1"), new Sig("t2")];
target.splice(1, 1, source[0]);
target.splice(-1, 1, source[1]);
target.splice(99, 0, source[2]);
target.splice(0, 0, source[7]);
console.log("reads", show(target));

// The removed elements are observed.
const removed = target.splice(1, 2, source[1]);
const removed2 = target.splice(0, 1, source[0]);
console.log("removed", show(removed), show(removed2), show(target));

// Evaluation order: receiver, start, count, item.
const log: string[] = [];
const at = (label: string, value: number): number => {
  log.push(label);
  return value;
};
const read = (label: string, i: number): Sig => {
  log.push(label);
  return source[i]!;
};
target.splice(at("start", 1), at("count", 1), read("item", 2));
console.log("order", log.join(","), show(target));

// The item expression reassigns the receiver variable.
let list: Sig[] = [new Sig("l0"), new Sig("l1")];
const original = list;
const other: Sig[] = [];
list.splice(1, 0, ((list = other), source[0]));
console.log("reassigned", show(original), show(other), list === other);

// Numbers and strings from hole-observing loops.
const nums: number[] = [1];
nums[2] = 3;
const numsOut: number[] = [9];
for (const n of nums) numsOut.splice(1, 0, n);
const words: string[] = ["w"];
words[2] = "y";
const wordsOut: string[] = [];
for (const w of words) wordsOut.splice(0, 0, w);
console.log("scalars", JSON.stringify(numsOut), JSON.stringify(wordsOut), 1 in numsOut);

// A dropped source keeps inserted elements alive.
function collect(): Sig[] {
  const temp: Sig[] = [new Sig("x"), new Sig("y")];
  const out: Sig[] = [];
  for (const sig of temp) out.splice(0, 0, sig);
  temp.length = 0;
  return out;
}
console.log("collected", show(collect()));
