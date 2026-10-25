// Queues built from arrays: shift and splice(0, n) remove elements from the
// front while push, unshift, indexing, iteration and the other array
// operations keep seeing the remaining elements at indices from 0. Covers
// number, string, object and cycle-capable element arrays, holes moving
// with the elements, draining to empty and refilling, and sparse writes and
// growth after the front has moved.
function show(label: string, xs: (number | undefined)[]): void {
  const parts: string[] = [];
  for (let i = 0; i < xs.length; i++) parts.push(i in xs ? String(xs[i]) : "_");
  let visits = 0;
  xs.forEach(() => visits++);
  console.log(label, xs.length, parts.join(","), "visits", visits);
}

function checksum(xs: number[]): number {
  let s = 0;
  for (let i = 0; i < xs.length; i++) s = (s * 31 + xs[i]!) % 1000000007;
  return s;
}

// Drain a large queue: every shift answers the next element.
const big: number[] = [];
for (let i = 0; i < 20000; i++) big.push(i * 3);
let drained = 0;
let ordered = true;
let expected = 0;
while (big.length > 0) {
  const v = big.shift()!;
  if (v !== expected) ordered = false;
  expected += 3;
  drained += v;
}
console.log("drain", drained, ordered, big.length, big[0], JSON.stringify(big));

// Drained to empty, the array is reused from the front of its storage.
for (let round = 0; round < 3; round++) {
  for (let i = 0; i < 50; i++) big.push(round * 100 + i);
  let s = 0;
  while (big.length > 10) s += big.shift()!;
  console.log("refill", round, s, big.length, big[0], big[9], big.join(" "));
  big.length = 0;
}

// BFS-style: push at the back while shifting from the front, reading by
// index, from the end, and by iteration between operations.
const q: number[] = [1, 2, 3, 4, 5, 6, 7, 8];
const log: string[] = [];
for (let step = 0; step < 40; step++) {
  const head = q.shift()!;
  if (head % 3 !== 0) q.push(head * 2 + step);
  if (step % 4 === 0) q.push(-step);
  let sum = 0;
  for (const x of q) sum += x;
  if (step % 5 === 0) log.push(`${step}:${head}:${q.length}:${q[0]}:${q[q.length - 1]}:${sum}`);
}
console.log(log.join(" "));
console.log("bfs", q.length, checksum(q), q.indexOf(q[q.length - 1]!), q.includes(q[0]!));

// unshift reuses the room left by shift, then grows past it.
const d: number[] = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
for (let i = 0; i < 6; i++) d.shift();
console.log("shifted", d.join(","), d.length);
console.log("unshift", d.unshift(1), d.unshift(2, 3), d.join(","));
console.log("unshift", d.unshift(4, 5, 6, 7, 8, 9), d.join(","));
d.push(100, 101);
console.log("push", d.join(","), d[0], d[d.length - 1], d.length);
const spread = [-1, -2];
console.log("unshift-spread", d.unshift(...spread), d.join(","));
d.shift();
d.shift();
d.unshift(...d.slice(0, 3));
console.log("self", d.join(","));

// splice(0, n) removes a prefix as a value and as a statement.
const s: number[] = [];
for (let i = 0; i < 30; i++) s.push(i);
const front = s.splice(0, 4);
console.log("splice-front", front.join(","), s.length, s[0], s[25]);
s.splice(0, 3);
console.log("splice-stmt", s.length, s[0], s.join(","));
s.splice(0, 0);
s.splice(2, 2);
s.splice(0, 1, 99, 98);
console.log("splice-mixed", s.join(","));
console.log("splice-all", s.splice(0).length, s.length, JSON.stringify(s));
s.push(5);
console.log("after-all", s.join(","), s.length);

// Holes move with the elements on shift and stay holes.
const holes: (number | undefined)[] = [1, 2, 3, 4, 5, 6, 7, 8];
holes.length = 12;
holes[10] = 10;
holes.copyWithin(2, 9, 10);
holes[5] = undefined;
show("holes", holes);
console.log("hole-shift", holes.shift(), holes.shift());
show("holes-shifted", holes);
console.log("hole-head", holes.shift(), 0 in holes);
show("holes-after", holes);
holes.unshift(7);
show("holes-unshift", holes);
holes.push(42);
holes[2] = 22;
show("holes-write", holes);

// Sparse writes far past the end after the front moved, then more shifts
// (which then renumber the sparse entries) and growth over them.
const sp: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
sp.shift();
sp.shift();
sp[3000000] = 7;
console.log("sparse", sp.length, sp[0], sp[7], sp[3000000], 3000000 in sp, 2999999 in sp);
console.log("sparse-shift", sp.shift(), sp.length, sp[2999999], 2999999 in sp, 3000000 in sp);
for (let i = 7; i < 40; i++) sp[i] = i;
console.log("sparse-fill", sp.length, sp[0], sp[6], sp[7], sp[39], sp.indexOf(7), sp.lastIndexOf(7));
sp.length = 20;
console.log("sparse-trim", sp.join(","));

// Strings and objects: shifted references are owned by the caller, the
// remaining ones by the array.
const names: string[] = [];
for (let i = 0; i < 40; i++) names.push("n" + i);
const taken: string[] = [];
while (names.length > 25) taken.push(names.shift()!);
names.unshift("first", "second");
names.splice(0, 1);
console.log("strings", taken.join(""), names.length, names[0], names[1], names[names.length - 1]);
console.log("strings-ops", names.slice(0, 3).join("|"), names.concat(["z"]).length, [...names].reverse()[0]);
console.log("strings-sorted", names.toSorted().slice(0, 4).join(","), names.map((n) => n.length).join(""));

class Task {
  id: number;
  next: Task[];
  constructor(id: number, next: Task[]) {
    this.id = id;
    this.next = next;
  }
}
const tasks: Task[] = [];
for (let i = 0; i < 12; i++) tasks.push(new Task(i, tasks));
const done: number[] = [];
while (tasks.length > 3) {
  const t = tasks.shift()!;
  done.push(t.id);
  if (t.id % 4 === 0) tasks.push(new Task(t.id + 100, tasks));
}
tasks.unshift(new Task(-1, tasks));
console.log("tasks", done.join(","), tasks.map((t) => t.id).join(","), tasks[0]!.next === tasks);

// Small literals and boolean arrays shift by moving their elements.
const small: number[] = [];
small.push(1, 2, 3);
console.log("small", small.shift(), small.join(","), small.unshift(9), small.join(","));
const flags: boolean[] = [true, false, true, true, false];
console.log("bools", flags.shift(), flags.shift(), flags.join(","), flags.unshift(false), flags.join(","));

// Copying and searching operations on a shifted array.
const c: number[] = [5, 4, 3, 2, 1, 0, -1, -2];
c.shift();
c.shift();
console.log("ops", c.slice(1, 3).join(","), c.toReversed().join(","), [...c].sort((x, y) => x - y).join(","));
console.log("ops2", Array.from(c).length, c.filter((x) => x > 0).join(","), c.reduce((x, y) => x + y, 0));
c.reverse();
c.fill(7, 0, 2);
c.copyWithin(3, 0, 2);
console.log("ops3", c.join(","), c.at(-1), c.findIndex((x) => x === 3), c.every((x) => x < 10));
c.sort((x, y) => y - x);
console.log("ops4", c.join(","), c.pop(), c.shift(), c.join(","));
