// Front deletes combined with the storage changes that renumber entries:
// compaction after many deletes, regrowth, clear(), and dense integer
// keys. Each walk starts at the first live entry, also through an
// iterator taken from a Map reached as an unknown value.
const m = new Map<number, number>();
for (let i = 0; i < 200; i++) m.set(i, i);
for (let i = 0; i < 190; i++) m.delete(i); // compacts once few entries are live
console.log(m.size, [...m.keys()].join(","), m.keys().next().value);
for (let i = 200; i < 260; i++) m.set(i, i); // grows again
for (let i = 190; i < 250; i++) m.delete(i);
let firstKey = -1;
for (const k of m.keys()) {
  firstKey = k;
  break;
}
console.log(m.size, firstKey, [...m.values()].join(","));

m.clear();
console.log(m.size, m.keys().next().done);
m.set(5, 50);
m.set(1, 10);
m.delete(5);
const entry = m.entries().next().value;
console.log([...m].map(([k, v]) => k + "=" + v).join(";"), entry === undefined ? "none" : entry[0] + "=" + entry[1]);

// String keys across many delete/insert rounds.
const queue = new Map<string, number>();
let produced = 0;
let consumed = "";
for (let round = 0; round < 50; round++) {
  for (let j = 0; j < 7; j++) queue.set("job" + produced, produced++);
  for (let j = 0; j < 5; j++) {
    const oldest = queue.keys().next().value;
    if (oldest === undefined) break;
    if (round === 49) consumed += oldest + " ";
    queue.delete(oldest);
  }
}
console.log(queue.size, consumed.trim(), queue.keys().next().value);

const opaque: unknown = queue;
if (opaque instanceof Map) {
  const it = opaque.keys();
  console.log(it.next().value, it.next().value);
  for (const k of [...opaque.keys()].slice(0, 95)) opaque.delete(k);
  console.log(opaque.size, opaque.keys().next().value);
}
