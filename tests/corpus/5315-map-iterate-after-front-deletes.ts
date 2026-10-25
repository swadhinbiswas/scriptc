// Iteration over a Map whose oldest entries were deleted: for-of, a
// for-of that breaks at the first entry, keys().next(), forEach and
// spread all start at the first live entry, in insertion order.
const m = new Map<number, string>();
for (let i = 0; i < 40; i++) m.set(i, "v" + i);
for (let i = 0; i < 30; i++) m.delete(i);
console.log(m.size, [...m.keys()].join(","));

let first = -1;
for (const k of m.keys()) {
  first = k;
  break;
}
console.log("first", first, m.keys().next().value, m.values().next().value);

const seen: string[] = [];
m.forEach((v, k) => seen.push(k + "=" + v));
console.log(seen.join(" "));

// Delete from the middle, then the new front.
m.delete(35);
m.delete(30);
m.delete(31);
console.log([...m.entries()].map(([k, v]) => k + ":" + v).join(" "));
for (const [k, v] of m) {
  console.log("first entry", k, v);
  break;
}

// Re-adding a deleted key appends it at the end.
m.set(0, "again");
console.log([...m.keys()].join(","), m.keys().next().value);

// Delete everything, then add.
for (const k of [...m.keys()]) m.delete(k);
console.log("empty", m.size, [...m].length, m.keys().next().done);
m.set(100, "new");
console.log([...m].map(([k, v]) => k + "=" + v).join(";"), m.keys().next().value);
