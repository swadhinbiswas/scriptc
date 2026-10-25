// Comparator sorts over dynamically typed values make Node's comparator
// calls: undefined values stay out of the comparator, and mixed
// values, objects and inconsistent answers produce Node's order.
'use strict';
let seed = 77;
function random() {
  seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
  return seed / 4294967296;
}
const pool = [3, "b", undefined, 1.5, "a", null, 2, true, { v: 4 }, -1, "10"];
for (const n of [2, 10, 40, 90, 300]) {
  const values = [];
  for (let i = 0; i < n; i++) values.push(pool[Math.floor(random() * pool.length)]);
  const log = [];
  const sorted = values.slice().sort((x, y) => {
    if (log.length < 16) log.push(typeof x + ":" + typeof y);
    const a = typeof x === "object" && x !== null ? x.v : Number(x);
    const b = typeof y === "object" && y !== null ? y.v : Number(y);
    return a - b;
  });
  console.log(n, log.join(" "));
  console.log(JSON.stringify(sorted), sorted.length, 3 in sorted);
  let calls = 0;
  values.sort(() => {
    calls++;
    return ((calls * 7) % 3) - 1;
  });
  console.log(calls, JSON.stringify(values.slice(0, 12)));
}

const records = [];
for (let i = 0; i < 150; i++) records.push({ id: i, group: "g" + (i % 7), score: Math.floor(random() * 40) });
const pairs = [];
records.sort((a, b) => {
  if (pairs.length < 24) pairs.push(a.id + "-" + b.id);
  return a.group < b.group ? -1 : a.group > b.group ? 1 : b.score - a.score;
});
console.log(pairs.join(" "));
console.log(records.slice(0, 20).map((r) => r.id).join(","));
