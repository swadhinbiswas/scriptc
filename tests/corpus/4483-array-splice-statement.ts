// splice() in statement position discards its removed elements. Insertion,
// removal, clamping, negative and fractional starts, holes, sparse
// receivers, evaluation order, and the lifetime of removed and inserted
// references must match Node exactly.

class Tag {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
}

function show(list: readonly Tag[]): string {
  const parts: string[] = [];
  for (let i = 0; i < list.length; i++) {
    parts.push(i in list ? (list[i] === undefined ? "undef" : list[i]!.name) : "hole");
  }
  return `${list.length}:[${parts.join(",")}]`;
}

const t = (name: string): Tag => new Tag(name);

// The insertType shape: a sorted insert at a binary-search position.
function insertSorted(list: number[], value: number): boolean {
  let lo = 0;
  let hi = list.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (list[mid]! === value) return false;
    if (list[mid]! < value) lo = mid + 1;
    else hi = mid - 1;
  }
  list.splice(lo, 0, value);
  return true;
}
const sorted: number[] = [];
for (const v of [5, 3, 9, 1, 7, 3, 5, 11, 0, 8]) insertSorted(sorted, v);
console.log("sorted", JSON.stringify(sorted));

// References: insert, replace, remove; removed values stay usable when
// another reference holds them.
const tags: Tag[] = [t("a"), t("b"), t("c"), t("d"), t("e")];
const held = tags[1]!;
tags.splice(1, 2, t("x"));
console.log("replace", show(tags), held.name);
tags.splice(-1, 1);
console.log("negative", show(tags));
tags.splice(1.7, 0, t("y"), t("z"));
console.log("fractional", show(tags));
tags.splice(99, 5, t("end"));
console.log("past end", show(tags));
tags.splice(-99, 1);
console.log("before start", show(tags));
tags.splice(2, Infinity);
console.log("to end", show(tags));
tags.splice(NaN, NaN, t("nan"));
console.log("nan", show(tags));
tags.splice(0, -3, t("neg-count"));
console.log("negative count", show(tags));
tags.splice(1, 1);
console.log("remove one", show(tags));
tags.splice(0, 0);
console.log("no-op", show(tags));

// Holes before and after the spliced range keep their positions shifted.
const gappy: Tag[] = [t("p")];
gappy[3] = t("q");
gappy[5] = t("r");
gappy.splice(1, 1, t("s"));
console.log("holes", show(gappy), 2 in gappy, 4 in gappy);
gappy.splice(4, 0, t("u"));
console.log("holes insert", show(gappy), 2 in gappy, 5 in gappy);

// A sparse receiver keeps sparse semantics.
const sparse: Tag[] = [t("s0")];
sparse[2000000] = t("far");
sparse.splice(1, 0, t("s1"));
console.log("sparse", sparse.length, sparse[1]!.name, sparse[2000001]!.name, 2000000 in sparse);
sparse.splice(0, 1);
console.log("sparse removed", sparse.length, sparse[0]!.name, sparse[2000000]!.name);

// Evaluation order: receiver, start, count, then each item.
const log: string[] = [];
const ordered: Tag[] = [t("o1"), t("o2")];
const pick = (label: string, value: number): number => {
  log.push(label);
  return value;
};
const item = (label: string): Tag => {
  log.push(label);
  return t(label);
};
ordered.splice(pick("start", 1), pick("count", 0), item("i1"), item("i2"));
console.log("order", log.join(","), show(ordered));

// Items that mutate the receiver while they evaluate.
const mutating: Tag[] = [t("m1"), t("m2"), t("m3")];
mutating.splice(1, 1, ((mutating.length = 1), t("after")));
console.log("mutating", show(mutating));

// Numbers, booleans, and strings.
const nums = [1, 2, 3, 4];
nums.splice(1, 2, 20, 30, 40);
const flags = [true, false];
flags.splice(1, 0, true);
const words = ["a", "b", "c"];
words.splice(0, 2);
console.log("scalars", JSON.stringify(nums), JSON.stringify(flags), JSON.stringify(words));

// The result is still observed when it is used.
const kept = [t("k1"), t("k2"), t("k3")];
const removed = kept.splice(0, 2, t("k0"));
console.log("result", show(removed), show(kept));

// Many inserts and removals in a loop: stable counts and contents.
const churn: Tag[] = [];
for (let i = 0; i < 300; i++) {
  churn.splice(i % 7, 0, t("c" + i));
  if (i % 3 === 0) churn.splice(i % 5, 1);
}
console.log("churn", churn.length, churn[0]!.name, churn[churn.length - 1]!.name);
