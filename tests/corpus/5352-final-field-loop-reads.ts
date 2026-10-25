// Loops reading construction-only fields see one value per call; fields
// anything else writes keep being re-read.

class Grid {
  readonly w: number;
  readonly h: number;
  readonly data: Float64Array;
  readonly out: Float64Array;
  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.data = new Float64Array(w * h);
    this.out = new Float64Array(w * h);
    for (let i = 0; i < w * h; i++) this.data[i] = (i % 7) * 0.5;
  }
  blur(): number {
    let sum = 0;
    for (let y = 1; y < this.h - 1; y++) {
      for (let x = 1; x < this.w - 1; x++) {
        const i = y * this.w + x;
        this.out[i] = (this.data[i - 1]! + this.data[i + 1]! + this.data[i - this.w]! + this.data[i + this.w]!) / 4;
        sum += this.out[i]!;
      }
    }
    return sum;
  }
}
const grid = new Grid(9, 7);
console.log("blur", grid.blur(), grid.out[10], grid.out[grid.w * 2 + 3]);

// A base constructor runs an overridden method before the subclass has
// defined its fields: that call sees them missing, later calls see them.
class Counter {
  readonly seen: number;
  constructor() {
    this.seen = this.count();
  }
  count(): number {
    return 0;
  }
}
class Limited extends Counter {
  readonly limit: number = 4;
  readonly step: number = 2;
  override count(): number {
    let n = 0;
    for (let i = 0; i < this.limit; i += this.step) n++;
    return n;
  }
}
const limited = new Limited();
console.log("limited", limited.seen, limited.count(), limited.limit);

// Fields a method updates are re-read on every iteration.
class Accumulator {
  total = 0;
  hits = 0;
  readonly cap: number;
  constructor(cap: number) {
    this.cap = cap;
  }
  fill(): number {
    while (this.total < this.cap) {
      this.total += 3;
      this.hits++;
    }
    return this.hits;
  }
}
const acc = new Accumulator(20);
console.log("acc", acc.fill(), acc.total, acc.hits);

// A field written through another instance is not construction-only.
class Node2 {
  limit: number;
  peer: Node2 | null = null;
  constructor(limit: number) {
    this.limit = limit;
  }
  walk(): number {
    let steps = 0;
    for (let i = 0; i < this.limit; i++) {
      steps++;
      if (this.peer !== null && i === 1) this.peer.limit = 2;
    }
    return steps;
  }
}
const a = new Node2(6);
a.peer = a;
console.log("peer", a.walk(), a.limit);

// The reference is final; the array it holds still grows during the loop.
class Bag {
  readonly items: number[] = [];
  readonly cap: number;
  constructor(cap: number) {
    this.cap = cap;
  }
  grow(): string {
    while (this.items.length < this.cap) this.items.push(this.items.length * this.cap);
    return this.items.join(",");
  }
}
console.log("bag", new Bag(5).grow());

// Final fields read through a parameter, and from a generator.
class Range {
  readonly lo: number;
  readonly hi: number;
  constructor(lo: number, hi: number) {
    this.lo = lo;
    this.hi = hi;
  }
  *values(): Generator<number> {
    for (let i = this.lo; i < this.hi; i++) yield i;
  }
}
function span(r: Range): number {
  let s = 0;
  for (let i = r.lo; i < r.hi; i++) s += i;
  return s;
}
const r = new Range(3, 9);
console.log("range", span(r), [...r.values()].join(" "));
