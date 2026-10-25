// Number-key Map.set and Set.add of present keys while the map is at its
// bucket-table growth boundary (the next new key grows the index):
// overwrites keep the entry, its position and the size, and release the
// value they replace.

interface Box {
  label: string;
}

function sparse(i: number): number {
  return 1000 + i * 7919;
}

for (const size of [8, 64, 1024]) {
  const nums = new Map<number, number>();
  const boxes = new Map<number, Box>();
  const names = new Map<number, string>();
  const seen = new Set<number>();
  for (let i = 0; i < size; i++) {
    nums.set(sparse(i), i);
    boxes.set(sparse(i), { label: `b${i}` });
    names.set(sparse(i), `n${i}`);
    seen.add(sparse(i));
  }
  for (let round = 0; round < 3; round++) {
    for (let i = size - 1; i >= 0; i--) {
      nums.set(sparse(i), i * 10 + round);
      boxes.set(sparse(i), { label: `b${i}.${round}` });
      names.set(sparse(i), `n${i}.${round}`.repeat(2));
      seen.add(sparse(i));
    }
  }
  let sum = 0;
  for (const v of nums.values()) sum += v;
  const firstKeys = [...nums.keys()].slice(0, 3).join(",");
  console.log(
    size,
    nums.size,
    boxes.size,
    names.size,
    seen.size,
    sum,
    firstKeys,
    boxes.get(sparse(size - 1))?.label,
    names.get(sparse(0)),
    [...seen].slice(0, 2).join(","),
  );
  // One more key grows the index; existing entries are unchanged.
  nums.set(-1, -1);
  boxes.set(-1, { label: "new" });
  console.log(size, "grown", nums.size, nums.get(sparse(size >> 1)), nums.get(-1), boxes.get(-1)?.label, boxes.get(sparse(1))?.label);
}

// At the boundary after deletes: a delete frees no bucket, so re-adding
// the deleted key compacts instead of growing.
const churn = new Map<number, number>();
for (let i = 0; i < 64; i++) churn.set(sparse(i), i);
churn.delete(sparse(10));
churn.set(sparse(11), 111);
churn.set(sparse(10), 110);
console.log("churn", churn.size, churn.get(sparse(10)), churn.get(sparse(11)), [...churn.keys()].indexOf(sparse(10)));
