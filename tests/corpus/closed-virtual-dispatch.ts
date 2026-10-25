// Virtual calls whose receivers can only be a few known classes dispatch to
// each implementation directly; every override, inherited body, super call,
// getter, throw and prototype replacement must still run exactly as in Node.

class Shape {
  x: number;
  constructor(x: number) {
    this.x = x;
  }
  area(): number {
    return 0;
  }
  name(): string {
    return "shape";
  }
  describe(): string {
    return this.name() + ":" + this.area().toFixed(2);
  }
  bump(by: number): void {
    this.x += by;
  }
}

class Circle extends Shape {
  r: number;
  constructor(x: number, r: number) {
    super(x);
    this.r = r;
  }
  area(): number {
    return Math.PI * this.r * this.r;
  }
  name(): string {
    return "circle";
  }
  bump(by: number): void {
    super.bump(by * 2);
  }
}

class Rect extends Shape {
  w: number;
  h: number;
  constructor(x: number, w: number, h: number) {
    super(x);
    this.w = w;
    this.h = h;
  }
  area(): number {
    return this.w * this.h;
  }
}

// Inherits Rect.area, overrides name with a super call.
class Square extends Rect {
  constructor(x: number, s: number) {
    super(x, s, s);
  }
  name(): string {
    return "square<" + super.name() + ">";
  }
}

const shapes: Shape[] = [];
for (let i = 0; i < 12; i++) {
  if (i % 3 === 0) shapes.push(new Circle(i, (i % 4) + 1));
  else if (i % 3 === 1) shapes.push(new Rect(i, (i % 5) + 1, 2));
  else shapes.push(new Square(i, (i % 3) + 1));
}

let total = 0;
for (let round = 0; round < 3; round++) {
  for (const s of shapes) {
    s.bump(1);
    total += s.area() + s.x;
  }
}
console.log("total", total.toFixed(6));
for (const s of shapes.slice(0, 6)) console.log(s.describe(), s.x);

// An abstract base with two implementations, one of which can throw.
abstract class Op {
  abstract apply(v: number): number;
  run(v: number): number {
    return this.apply(v) + 1;
  }
}
class Double extends Op {
  apply(v: number): number {
    return v * 2;
  }
}
class Checked extends Op {
  apply(v: number): number {
    if (v > 7) throw new RangeError("too big: " + v);
    return v - 1;
  }
}
const ops: Op[] = [new Double(), new Checked(), new Double(), new Checked()];
let acc = 0;
let failures = 0;
for (let v = 0; v < 12; v++) {
  try {
    acc += ops[v % ops.length].run(v);
  } catch (e) {
    failures++;
    if (e instanceof RangeError) console.log("caught", e.message);
  }
}
console.log("acc", acc, "failures", failures);

// Getters dispatch like methods.
class Base {
  get label(): string {
    return "base";
  }
}
class Left extends Base {
  get label(): string {
    return "left";
  }
}
class Right extends Base {
  get label(): string {
    return "right/" + super.label;
  }
}
const sides: Base[] = [new Left(), new Right(), new Left()];
console.log(sides.map((b) => b.label).join(","));

// Methods returning objects: the result's ownership crosses the dispatch.
class Pt {
  a: number;
  b: number;
  constructor(a: number, b: number) {
    this.a = a;
    this.b = b;
  }
}
class Maker {
  make(i: number): Pt {
    return new Pt(i, 0);
  }
}
class Flip extends Maker {
  make(i: number): Pt {
    return new Pt(0, i);
  }
}
const makers: Maker[] = [new Maker(), new Flip()];
let sum = 0;
for (let i = 0; i < 10; i++) {
  const p = makers[i % 2].make(i);
  sum += p.a * 10 + p.b;
}
console.log("sum", sum);

// Five implementations: past the guarded limit, still exact.
class K {
  v(): number {
    return 0;
  }
}
class K1 extends K {
  v(): number {
    return 1;
  }
}
class K2 extends K {
  v(): number {
    return 2;
  }
}
class K3 extends K {
  v(): number {
    return 3;
  }
}
class K4 extends K {
  v(): number {
    return 4;
  }
}
const ks: K[] = [new K(), new K1(), new K2(), new K3(), new K4()];
let kv = 0;
for (let i = 0; i < 20; i++) kv = kv * 3 + ks[i % 5].v();
console.log("kv", kv);

// A method replaced on a prototype at run time.
class A {
  f(): number {
    return 1;
  }
}
class B extends A {
  f(): number {
    return 2;
  }
}
class C extends A {
  f(): number {
    return 3;
  }
}
const xs: A[] = [new A(), new B(), new C()];
let t = 0;
for (const x of xs) t += x.f();
console.log("before", t);
B.prototype.f = function (this: B): number {
  return 20;
};
t = 0;
for (const x of xs) t += x.f();
console.log("after", t);
