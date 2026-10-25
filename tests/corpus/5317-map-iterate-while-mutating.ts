// Mutation during iteration: entries deleted ahead of the walk are not
// visited, entries appended are, deleting the current or front entry
// does not skip the next one, and clear() ends the walk unless the
// body appends again.
const m = new Map<string, number>();
for (let i = 0; i < 8; i++) m.set("k" + i, i);
const visited: string[] = [];
for (const [k, v] of m) {
  visited.push(k);
  if (v === 1) m.delete("k3");
  if (v === 2) m.delete("k0"); // already visited: the front entry
  if (v === 4) m.delete(k); // the current entry
  if (v === 5) m.set("late", 50);
}
console.log(visited.join(","), "|", [...m.keys()].join(","));

const n = new Map<number, number>();
for (let i = 0; i < 6; i++) n.set(i, i * i);
const order: number[] = [];
for (const k of n.keys()) {
  order.push(k);
  n.delete(k); // delete each entry as it is visited
  if (k === 2) n.set(99, 0);
}
console.log(order.join(","), n.size, [...n.keys()].join(","));

const c = new Map<number, string>([
  [1, "a"],
  [2, "b"],
  [3, "c"],
]);
const cleared: string[] = [];
for (const [k, v] of c) {
  cleared.push(k + v);
  if (k === 1) {
    c.clear();
    c.set(7, "z");
  }
}
console.log(cleared.join(","), c.size, [...c].map(([k, v]) => k + v).join(";"));

// Nested walks over one map, with deletes from the inner loop.
const nested = new Map<number, number>();
for (let i = 0; i < 5; i++) nested.set(i, i);
const pairs: string[] = [];
for (const a of nested.keys()) {
  for (const b of nested.keys()) {
    if (b < a) nested.delete(b);
    else pairs.push(a + "" + b);
  }
}
console.log(pairs.join(" "), [...nested.keys()].join(","));
