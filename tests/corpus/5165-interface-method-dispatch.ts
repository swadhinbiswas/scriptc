// Method calls through interface-typed receivers whose implementations are
// program classes: number, string and boolean arguments and results, void
// methods (including implementations that return a value), methods
// that read and write `this`, thrown errors, and object-literal
// implementations of the same interface.
interface Shape {
  area(): number;
  scale(k: number): number;
  describe(prefix: string, loud: boolean): string;
  grow(by: number): void;
}

class Circle implements Shape {
  r: number;
  constructor(r: number) {
    this.r = r;
  }
  area(): number {
    return 3 * this.r * this.r;
  }
  scale(k: number): number {
    return this.r * k;
  }
  describe(prefix: string, loud: boolean): string {
    const text = `${prefix} circle r=${this.r}`;
    return loud ? text.toUpperCase() : text;
  }
  grow(by: number): void {
    this.r += by;
  }
}

class Rect implements Shape {
  w: number;
  h: number;
  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
  }
  area(): number {
    return this.w * this.h;
  }
  scale(k: number): number {
    if (k < 0) throw new RangeError(`negative scale ${k}`);
    return (this.w + this.h) * k;
  }
  describe(prefix: string, loud: boolean): string {
    return `${prefix} rect ${this.w}x${this.h}${loud ? "!" : ""}`;
  }
  // A void interface method may be implemented by one that returns a value.
  grow(by: number): number {
    this.w += by;
    this.h += by;
    return this.w * this.h;
  }
}

const literal: Shape = {
  area: () => 1,
  scale(k: number): number {
    return k + 0.5;
  },
  describe(prefix: string, loud: boolean): string {
    return `${prefix} literal ${loud}`;
  },
  grow(by: number): void {
    console.log("literal grows", by);
  },
};

function report(s: Shape): string {
  return `${s.area()} ${s.scale(2)} ${s.describe("a", false)} ${s.describe("b", true)}`;
}

const shapes: Shape[] = [new Circle(1), new Rect(2, 3), literal];
for (const s of shapes) console.log(report(s));

for (const s of shapes) {
  s.grow(1);
  console.log(s.area());
}

let total = 0;
for (let i = 0; i < 1000; i++) total += shapes[i % 3]!.scale(i & 7);
console.log(total);

try {
  shapes[1]!.scale(-1);
} catch (error) {
  console.log((error as Error).name, (error as Error).message);
}

// Mutation through the interface is visible on the instance.
const c = new Circle(5);
const asShape: Shape = c;
asShape.grow(2);
console.log(c.r, asShape.area(), asShape.describe("c", false));
