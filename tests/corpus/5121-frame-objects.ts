// Instances of small classes with number fields that are only read keep
// their values; constructors that register `this`, methods returning
// `this`, subclasses and throwing constructors behave as in Node.
class Vec {
  x: number;
  y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
  dot(o: Vec): number {
    return this.x * o.x + this.y * o.y;
  }
  self(): Vec {
    return this;
  }
}
const registry: Tracked[] = [];
class Tracked {
  id: number;
  constructor(id: number) {
    this.id = id;
    registry.push(this);
  }
  twice(): number {
    return this.id * 2;
  }
}
class Base {
  v: number;
  constructor(v: number) {
    this.v = v;
  }
  get(): number {
    return this.v;
  }
}
class Derived extends Base {
  get(): number {
    return this.v * 100;
  }
}
class Checked {
  n: number;
  half: number;
  constructor(n: number) {
    this.n = n;
    if (n < 0) throw new RangeError(`negative ${n}`);
    this.half = n / 2;
  }
  sum(): number {
    return this.n + this.half;
  }
}
class Defaults {
  a = 1;
  b = 2;
  c: number;
  constructor(c: number) {
    this.c = c + this.a + this.b;
  }
  total(): number {
    return this.a + this.b + this.c;
  }
}

let total = 0;
const selves: Vec[] = [];
for (let i = 0; i < 5; i++) {
  const v = new Vec(i, i + 1);
  total += v.dot(new Vec(2, 3)) + new Vec(i, i).dot(v);
  const t = new Tracked(i);
  total += t.twice();
  selves.push(new Vec(i, -i).self());
  const b: Base = i % 2 === 0 ? new Base(i) : new Derived(i);
  total += b.get();
  try {
    const c = new Checked(i - 2);
    total += c.sum();
  } catch (error) {
    console.log("caught", (error as Error).message);
  }
  total += new Defaults(i).total();
}
console.log(total);
console.log(registry.map((t) => t.id).join(","), selves.map((v) => `${v.x}/${v.y}`).join(","));
