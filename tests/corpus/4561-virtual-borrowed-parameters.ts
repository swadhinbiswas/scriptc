// Virtual calls borrow a parameter when every implementation of the method
// has a borrowing body for it: the receiver of a visitor-style forEachChild,
// for example. An implementation that reassigns or captures a parameter
// needs its own reference, so the slot passes that parameter owned, and the
// implementations that borrow more parameters than the slot release the
// extra ones in an adapter. Receivers whose
// last outside owner is dropped during the call, early exits, results and
// exceptions must all behave exactly as under Node.

abstract class Visitor {
  visited = 0;
  abstract visit(node: Shape): boolean;
}

abstract class Shape {
  id: number;
  constructor(id: number) {
    this.id = id;
  }
  abstract forEachChild(v: Visitor): boolean;
  abstract area(): number;
  // Square captures `this` in a closure: the receiver is passed owned.
  abstract remember(other: Shape): Shape;
  // Holder reassigns `tag`: `this` and `scale` stay borrowed, `tag` is owned.
  abstract scaled(scale: Shape, tag: string): number;
}

let kept: Shape[] = [];

class Square extends Shape {
  side: number;
  constructor(id: number, side: number) {
    super(id);
    this.side = side;
  }
  forEachChild(_v: Visitor): boolean {
    return false;
  }
  area(): number {
    return this.side * this.side;
  }
  remember(other: Shape): Shape {
    kept.push(other);
    const self = (): Shape => this;
    return self();
  }
  scaled(scale: Shape, tag: string): number {
    return this.area() * scale.id + tag.length;
  }
}

class Group extends Shape {
  items: Shape[];
  label = "";
  constructor(id: number, items: Shape[]) {
    super(id);
    this.items = items;
  }
  forEachChild(v: Visitor): boolean {
    for (const item of this.items) if (v.visit(item)) return true;
    return false;
  }
  area(): number {
    let sum = 0;
    for (const item of this.items) sum += item.area();
    return sum;
  }
  remember(other: Shape): Shape {
    return other;
  }
  scaled(scale: Shape, tag: string): number {
    this.label = tag;
    let sum = 0;
    for (const item of this.items) sum += item.scaled(scale, tag);
    return sum;
  }
}

class Holder extends Shape {
  inner: Shape | undefined;
  constructor(id: number, inner: Shape) {
    super(id);
    this.inner = inner;
  }
  forEachChild(v: Visitor): boolean {
    const inner = this.inner;
    // Drops the holder's own reference to its child while it is visited.
    this.inner = undefined;
    const stop = inner !== undefined && v.visit(inner);
    this.inner = inner;
    return stop;
  }
  area(): number {
    if (this.inner === undefined) throw new Error(`empty holder ${this.id}`);
    return this.inner.area();
  }
  remember(other: Shape): Shape {
    this.inner = other;
    return this;
  }
  scaled(scale: Shape, tag: string): number {
    if (tag.length > 3) tag = tag.slice(0, 3);
    return (this.inner?.scaled(scale, tag) ?? 0) + scale.id;
  }
}

class Counter extends Visitor {
  limit: number;
  constructor(limit: number) {
    super();
    this.limit = limit;
  }
  visit(node: Shape): boolean {
    this.visited++;
    if (this.visited >= this.limit) return true;
    return node.forEachChild(this);
  }
}

class Collector extends Visitor {
  ids: number[] = [];
  visit(node: Shape): boolean {
    this.ids.push(node.id);
    return node.forEachChild(this);
  }
}

function build(depth: number, start: number): Shape {
  if (depth === 0) return new Square(start, start % 5);
  const items: Shape[] = [];
  for (let i = 0; i < 3; i++) items.push(build(depth - 1, start * 3 + i));
  return depth % 2 === 0 ? new Holder(start, new Group(-start, items)) : new Group(start, items);
}

const tree = build(4, 1);
const collector = new Collector();
tree.forEachChild(collector);
console.log(collector.ids.length, collector.ids.slice(0, 8).join(","));
for (const limit of [1, 5, 40, 1000]) {
  const counter = new Counter(limit);
  console.log(limit, tree.forEachChild(counter), counter.visited);
}
console.log(tree.area());

// The holder releases its reference to the child for the duration of the
// visit; the child must survive through the call's own owner.
const lonely = new Holder(99, new Square(7, 3));
const probe = new Collector();
console.log(lonely.forEachChild(probe), probe.ids, lonely.area());

// Owned slot: implementations keep the argument.
const square = new Square(1, 2);
const group = new Group(2, [square]);
const shapes: Shape[] = [square, group, lonely];
for (const s of shapes) s.remember(new Square(50 + s.id, 1));
console.log(kept.map((k) => k.id).join(","), lonely.area());

// Mixed slot: `scale` is borrowed by every implementation, `tag` is kept by Group.
let total = 0;
for (let round = 0; round < 3; round++)
  for (const s of shapes) total += s.scaled(new Square(round + 1, 1), `tag${round}`);
console.log(total, group.label);

// Exceptions out of a borrowed virtual call release the frame's owners.
const empty = new Holder(5, new Square(1, 1));
empty.remember(new Square(2, 2));
let failures = 0;
for (let i = 0; i < 4; i++) {
  const h = new Holder(i, new Square(i, i));
  if (i % 2 === 1) h.inner = undefined;
  try {
    total += h.area();
  } catch (e) {
    failures++;
    console.log((e as Error).message);
  }
}
console.log(total, failures);
