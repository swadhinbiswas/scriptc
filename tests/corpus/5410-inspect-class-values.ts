// console.log and util.inspect of class instances reached through untyped
// values, interface-typed values, arrays of them, records and function
// fields' `this`: each prints with its class's name, including subclasses,
// class expressions, anonymous classes and the depth limit.
import { inspect } from "node:util";

interface Shape {
  area(): number;
}

class Circle implements Shape {
  r: number;
  constructor(r: number) {
    this.r = r;
  }
  area(): number {
    return 3 * this.r * this.r;
  }
}

class Ring extends Circle {
  inner: number;
  constructor(r: number, inner: number) {
    super(r);
    this.inner = inner;
  }
}

class Empty {}

const shapes: Shape[] = [new Circle(1), new Ring(2, 1)];
console.log(shapes);
const one: Shape = new Ring(3, 2);
console.log(one, [one], { one });

const values: unknown[] = [new Circle(4), new Empty(), { plain: true }];
console.log(values);

const Named = class {
  x = 1;
};
const anonymous: unknown[] = [
  new Named(),
  new (class {
    y = 2;
  })(),
];
console.log(anonymous);

class Holder {
  child: Shape;
  constructor(child: Shape) {
    this.child = child;
  }
}
const nested: unknown = [[[new Holder(new Circle(5))]]];
console.log(nested);
console.log(inspect(nested, { depth: 0 }), inspect(nested, { depth: 10 }));

class Callback {
  name = "callback";
  run: (this: Callback) => void;
  constructor() {
    this.run = function (this: Callback): void {
      console.log(this);
    };
  }
}
new Callback().run();
