// Function-typed class fields called as methods (`h.fn(x)`): JS binds the
// instance as `this`. Function expressions read it, store it, compare it
// with the instance and with itself, and mutate the instance through it;
// arrow fields keep their lexical `this`. Each call gets its own binding,
// nested field calls bind their own instances, and a callee that throws
// still leaves the outer binding in place.
class Counter {
  count = 0;
  label: string;
  step: (this: Counter, by: number) => number;
  describe: (this: Counter) => string;
  arrow: (x: number) => number;
  inner: Counter | null = null;
  constructor(label: string) {
    this.label = label;
    this.step = function (this: Counter, by: number): number {
      this.count += by;
      return this.count;
    };
    this.describe = function (this: Counter): string {
      return `${this.label}=${this.count}`;
    };
    this.arrow = (x: number) => x * 2;
  }
}

const a = new Counter("a");
const b = new Counter("b");
console.log(a.step(2), a.step(3), b.step(10), a.describe(), b.describe());
console.log(a.arrow(21), b.arrow(1));

// The bound receiver is the instance itself, and stays one value within a call.
let seen: Counter | null = null;
let same = false;
a.describe = function (this: Counter): string {
  seen = this;
  same = this === this;
  return `${this.label}:${this === a}:${this === b}`;
};
console.log(a.describe(), seen === a, same);

// Nested calls: the callee calls another instance's field.
a.inner = b;
a.step = function (this: Counter, by: number): number {
  const before = this.inner === null ? -1 : this.inner.step(by * 100);
  this.count += by;
  return before + this.count;
};
console.log(a.step(1), a.describe(), b.describe());

// A throwing callee: the receiver of the surrounding call is unaffected.
const thrower = new Counter("thrower");
thrower.step = function (this: Counter, by: number): number {
  if (by > 0) throw new Error(`${this.label} refused ${by}`);
  return 0;
};
b.describe = function (this: Counter): string {
  let message = "";
  try {
    thrower.step(5);
  } catch (error) {
    message = (error as Error).message;
  }
  return `${this.label} after ${message}`;
};
console.log(b.describe());

// Many calls in a loop, alternating receivers.
let total = 0;
const pair = [new Counter("x"), new Counter("y")];
pair[0]!.step = pair[1]!.step;
for (let i = 0; i < 1000; i++) total += pair[i % 2]!.step(1);
console.log(total, pair[0]!.count, pair[1]!.count);

// Dynamic views of the bound receiver: `in` sees the prototype members of
// the instance's own class (subclasses included), and for-in and
// Object.keys list its own fields.
class Shape {
  w = 2;
  h = 3;
  area(): number {
    return this.w * this.h;
  }
  probe: (this: Shape) => string;
  constructor() {
    this.probe = function (this: Shape): string {
      const keys: string[] = [];
      for (const k in this) keys.push(k);
      return `${"area" in this} ${"constructor" in this} ${"missing" in this} ${Object.keys(this).join(",")} ${keys.join(",")}`;
    };
  }
}
class Square extends Shape {
  side(): number {
    return this.w;
  }
}
const shape = new Shape();
const square = new Square();
console.log(shape.probe(), "|", square.probe());
const members = function (this: Shape): string {
  return `${"side" in this} ${"area" in this} ${this.area()}`;
};
shape.probe = members;
square.probe = members;
console.log(shape.probe(), "|", square.probe());
