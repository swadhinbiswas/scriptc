// Cycle-collector types that stop bypassing the young generations.
//
// The collector lets a type skip its nursery or mature passes while that
// type's candidates keep surviving there, and probes such a type now and
// then by walking it at the level again. This program first builds a large
// long-lived graph of one class and keeps many long-lived closures (so both
// types skip the young passes), then switches to a phase where objects of
// the same types die young in cycles in which EVERY member is a cycle
// candidate: pairs of nodes released one after the other, and recursive
// local closures, each holding the capture box that holds it. It also makes
// cross-generation garbage: young nodes in cycles with nodes of the
// long-lived graph that are then cut loose, which only a pass over the older
// generations can free.
//
// The output pins the surviving structure; the sanitized lane's exit RC
// audit proves that every dead cycle was reclaimed, and AddressSanitizer
// that no pass touched a freed object.
class Item {
  id: number;
  next: Item | null = null;
  peer: Item | null = null;
  kids: Item[] = [];
  constructor(id: number) {
    this.id = id;
  }
}

function grow(root: Item, n: number, base: number): void {
  let at = root;
  for (let i = 0; i < n; i++) {
    const item = new Item(base + i);
    item.peer = at;
    at.kids.push(item);
    if (i % 8 === 7) at = item;
  }
}

function sum(root: Item): number {
  let total = 0;
  const stack: Item[] = [root];
  while (stack.length > 0) {
    const item = stack.pop()!;
    total = (total + item.id) % 1000003;
    for (const kid of item.kids) stack.push(kid);
  }
  return total;
}

// Long-lived phase: tens of thousands of candidates that all survive.
const roots: Item[] = [];
for (let r = 0; r < 4; r++) {
  const root = new Item(r);
  grow(root, 12000, r * 100000);
  roots.push(root);
}
const keepers: (() => number)[] = [];
for (let i = 0; i < 20000; i++) {
  const k = i;
  keepers.push(() => k * 2);
}
console.log("built", roots.map(sum).join(" "), keepers.length);

// Young garbage in which every member is a candidate.
function pairs(n: number): number {
  let made = 0;
  for (let i = 0; i < n; i++) {
    const a = new Item(i);
    const b = new Item(-i);
    a.next = b;
    b.next = a;
    made += a.id - b.id;
  }
  return made;
}

function closures(n: number): number {
  let total = 0;
  for (let i = 0; i < n; i++) {
    // A recursive local function: the closure captures the box that holds
    // it, so plain reference counting can never free the pair.
    const countDown = (k: number): number => (k <= 0 ? 0 : 1 + countDown(k - 1));
    total += countDown(i % 5);
  }
  return total;
}

let young = 0;
for (let round = 0; round < 12; round++) young += pairs(20000) + closures(20000);
console.log("young", young);

// Cross-generation garbage: young items in cycles with old ones, then the
// old subtrees are cut loose from their roots.
let crossed = 0;
for (const root of roots) {
  const stack: Item[] = [root];
  while (stack.length > 0) {
    const item = stack.pop()!;
    if (item.id % 3 === 0) {
      const fresh = new Item(-item.id);
      fresh.peer = item;
      item.next = fresh;
      crossed++;
    }
    for (const kid of item.kids) stack.push(kid);
  }
  root.kids.length = Math.floor(root.kids.length / 2);
}
for (let round = 0; round < 4; round++) young += pairs(20000) + closures(20000);
console.log("crossed", crossed, "young", young, roots.map(sum).join(" "));

let probe = 0;
for (const keep of keepers) probe += keep();
console.log("keepers", probe);
