// Interface method calls passing and returning records, arrays, class
// instances, unions, callbacks and untyped values: the callee sees the
// caller's objects (mutations and identity are shared), and returned
// objects are the ones the implementation holds.
type Vec = { x: number; y: number };

class Point {
  x: number;
  y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

interface Store {
  put(v: Vec, p: Point, xs: number[]): Vec;
  anchor(p: Point): Point;
  pick(flag: boolean): string | number;
  maybe(n: number): Point | null;
  each(xs: number[], fn: (x: number) => number): number;
  raw(value: unknown): unknown;
  names(): string[];
}

class Memory implements Store {
  last: Vec = { x: 0, y: 0 };
  kept: Point[] = [];
  put(v: Vec, p: Point, xs: number[]): Vec {
    v.x += 1;
    p.y += 1;
    xs.push(xs.length);
    this.last = v;
    return v;
  }
  anchor(p: Point): Point {
    this.kept.push(p);
    return p;
  }
  pick(flag: boolean): string | number {
    return flag ? "yes" : 42;
  }
  maybe(n: number): Point | null {
    return n > 0 ? new Point(n, -n) : null;
  }
  each(xs: number[], fn: (x: number) => number): number {
    let t = 0;
    for (const x of xs) t += fn(x);
    return t;
  }
  raw(value: unknown): unknown {
    return value;
  }
  names(): string[] {
    return ["memory"];
  }
}

class Copying implements Store {
  put(v: Vec, p: Point, xs: number[]): Vec {
    return { x: v.x + p.x + xs.length, y: v.y };
  }
  anchor(p: Point): Point {
    return new Point(p.x, p.y);
  }
  pick(flag: boolean): string | number {
    return flag ? 1 : "no";
  }
  maybe(n: number): Point | null {
    return n > 1 ? new Point(0, 0) : null;
  }
  each(xs: number[], fn: (x: number) => number): number {
    return xs.length === 0 ? 0 : fn(xs[0]!);
  }
  raw(value: unknown): unknown {
    return typeof value;
  }
  names(): string[] {
    return ["copy", "ing"];
  }
}

const stores: Store[] = [new Memory(), new Copying()];
for (const s of stores) {
  const v: Vec = { x: 1, y: 2 };
  const p = new Point(3, 4);
  const xs = [1, 2, 3];
  const out = s.put(v, p, xs);
  console.log(out === v, JSON.stringify(out), JSON.stringify(v), p.y, xs.join(","));
  console.log(s.anchor(p) === p, s.pick(true), s.pick(false));
  const m = s.maybe(2);
  console.log(m === null ? "null" : `${m.x},${m.y}`, s.maybe(0) === null);
  console.log(s.each([1, 2, 3], (x) => x * 10));
  console.log(s.raw({ a: 1 }), s.raw("text"), s.names().join("+"));
}

const memory = new Memory();
const asStore: Store = memory;
const shared = new Point(7, 8);
asStore.anchor(shared);
shared.x = 70;
console.log(memory.kept[0] === shared, memory.kept[0]!.x);

let sum = 0;
const v: Vec = { x: 0, y: 0 };
const p = new Point(1, 1);
const xs: number[] = [];
for (let i = 0; i < 100; i++) sum += stores[i % 2]!.put(v, p, xs).x;
console.log(sum, v.x, p.y, xs.length);
