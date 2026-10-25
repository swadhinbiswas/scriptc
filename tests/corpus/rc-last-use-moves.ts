// An owned local or parameter whose last statement reads it once hands its
// reference to that read (a push, a field store, a record field, an owned
// argument) instead of retaining a copy and releasing its own reference at
// scope exit. Constructor parameters that are stored as their last use take
// the owned convention, so a temporary argument moves straight into the
// field. Reads that are not last (aliases derived from the binding, loops,
// repeated reads) keep their own references; each case below reads values
// again after the stores and churns the allocator.

class Leaf {
  tag: string;
  constructor(tag: string) {
    this.tag = tag;
  }
}

class Node {
  readonly left: Node | null;
  readonly right: Node | null;
  constructor(left: Node | null, right: Node | null) {
    this.left = left;
    this.right = right;
  }
  count(): number {
    return 1 + (this.left === null ? 0 : this.left.count()) + (this.right === null ? 0 : this.right.count());
  }
}

function tree(depth: number): Node {
  return depth === 0 ? new Node(null, null) : new Node(tree(depth - 1), tree(depth - 1));
}

function churn(): number {
  let n = 0;
  for (let i = 0; i < 32; i++) n += new Leaf(`c${i}`).tag.length;
  return n;
}

// A pushed local moves into the array.
function rows(count: number): Leaf[] {
  const out: Leaf[] = [];
  for (let i = 0; i < count; i++) {
    const row = new Leaf(`row${i}`);
    if (i % 2 === 0) row.tag += "!";
    out.push(row);
  }
  return out;
}

// A derived alias keeps the source alive past the push.
function derived(): string {
  const holder = { leaf: new Leaf("inner") };
  const out: { leaf: Leaf }[] = [];
  const leaf = holder.leaf;
  out.push(holder);
  out.length = 0;
  churn();
  return leaf.tag;
}

// The same local read twice in its last statement keeps its reference.
class Pair {
  a: Leaf;
  b: Leaf;
  constructor(a: Leaf, b: Leaf) {
    this.a = a;
    this.b = b;
  }
}
function twice(): string {
  const leaf = new Leaf("both");
  const pair = new Pair(leaf, leaf);
  pair.a = new Leaf("first");
  churn();
  return `${pair.a.tag},${pair.b.tag}`;
}

// A local read inside a loop body is never moved.
function looped(): string {
  const leaf = new Leaf("loop");
  const out: Leaf[] = [];
  for (let i = 0; i < 3; i++) out.push(leaf);
  out[0] = new Leaf("x");
  churn();
  return out.map((l) => l.tag).join(",");
}

// A conditional last use: the other path releases the local at scope exit.
function conditional(flag: boolean, sink: Leaf[]): number {
  const leaf = new Leaf(flag ? "taken" : "skipped");
  if (flag) sink.push(leaf);
  churn();
  return sink.length;
}

// An exception after the move: the moved temp is released exactly once.
function failing(sink: Leaf[], fail: boolean): void {
  const leaf = new Leaf("pending");
  sink.push(fail ? (() => { throw new Error("boom"); })() : leaf);
}

// Owned constructor parameters: a caller still using its argument keeps it.
class Box {
  item: Leaf;
  note: string;
  constructor(item: Leaf, note: string) {
    if (note.length === 0) throw new Error("empty note");
    this.note = note;
    this.item = item;
  }
}
class LabeledBox extends Box {
  label: Leaf;
  constructor(item: Leaf, label: Leaf) {
    super(item, `labeled ${label.tag}`);
    this.label = label;
  }
}

// A walk local rebound from a parameter that is stored last.
class Chain {
  next: Chain | null = null;
  id: number;
  constructor(id: number) {
    this.id = id;
  }
}
class Ends {
  head: Chain;
  tail: Chain;
  constructor(head: Chain) {
    let n = head;
    while (n.next !== null) n = n.next;
    this.tail = n;
    this.head = head;
  }
}

// A setter-like method stores its parameter; an override does not.
class Holder {
  value: Leaf = new Leaf("initial");
  set(v: Leaf): void {
    this.value = v;
  }
}
class Ignoring extends Holder {
  set(v: Leaf): void {
    console.log("ignored", v.tag);
  }
}

console.log(tree(6).count());
console.log(
  rows(5)
    .map((r) => r.tag)
    .join(","),
);
console.log(derived());
console.log(twice());
console.log(looped());
const sink: Leaf[] = [];
console.log(conditional(true, sink), conditional(false, sink), sink[0]!.tag);
try {
  failing(sink, true);
} catch (e) {
  console.log("caught", (e as Error).message, sink.length);
}
failing(sink, false);
console.log(sink.map((l) => l.tag).join(","));

const shared = new Leaf("shared");
const box = new Box(shared, "first");
const again = new Box(shared, "second");
box.item = new Leaf("replaced");
churn();
console.log(box.item.tag, again.item.tag, shared.tag);
try {
  new Box(new Leaf("lost"), "");
} catch (e) {
  console.log("caught", (e as Error).message);
}
const labeled = new LabeledBox(new Leaf("item"), new Leaf("lbl"));
console.log(labeled.item.tag, labeled.label.tag, labeled.note);

const c1 = new Chain(1);
c1.next = new Chain(2);
c1.next.next = new Chain(3);
const ends = new Ends(c1);
c1.next = null;
churn();
console.log(ends.head.id, ends.tail.id);

const holders: Holder[] = [new Holder(), new Ignoring()];
for (const h of holders) {
  const v = new Leaf(`v${holders.indexOf(h)}`);
  h.set(v);
  churn();
  console.log(h.value.tag, v.tag);
}
const current = holders[0]!;
current.set(current.value);
console.log(current.value.tag);
