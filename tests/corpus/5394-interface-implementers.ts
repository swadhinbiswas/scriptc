// Interfaces with one implementing class, with many, and with classes and
// object literals mixed; loops and calls through each, including methods
// with string, record and class results.
interface Single {
  next(n: number): number;
}

class Only implements Single {
  step: number;
  constructor(step: number) {
    this.step = step;
  }
  next(n: number): number {
    return n + this.step;
  }
}

const singles: Single[] = [new Only(1), new Only(2), new Only(3)];
let n = 0;
for (let round = 0; round < 100; round++) for (const s of singles) n = s.next(n) % 1000;
console.log(n);

type Point = { x: number; y: number };
interface Many {
  name(): string;
  where(): Point;
}
class A implements Many {
  name(): string {
    return "a";
  }
  where(): Point {
    return { x: 1, y: 1 };
  }
}
class B implements Many {
  name(): string {
    return "b";
  }
  where(): Point {
    return { x: 2, y: 0 };
  }
}
class C implements Many {
  name(): string {
    return "c";
  }
  where(): Point {
    return { x: 0, y: 3 };
  }
}
class D extends C {
  override name(): string {
    return "d";
  }
}
const literal: Many = {
  name: () => "literal",
  where: () => ({ x: -1, y: -1 }),
};
const many: Many[] = [new A(), new B(), new C(), new D(), literal];
let names = "";
let x = 0;
for (let round = 0; round < 20; round++)
  for (const m of many) {
    names += m.name();
    x += m.where().x;
  }
console.log(names.length, names.slice(0, 12), x);
console.log(many.map((m) => `${m.name()}@${m.where().y}`).join(" "));
