// JavaScript subclass fields keep their assigned types when the base
// constructor only assigns fields, and stay undefined until assigned when
// the base constructor calls an overridden method first. Calls on a
// possibly missing array element throw Node's TypeError.
class Shape {
  constructor(name) {
    this.name = name;
    this.sides = 0;
  }
  area() {
    return 0;
  }
  describe() {
    return `${this.name} with ${this.sides} sides, area ${this.area()}`;
  }
}

class Rect extends Shape {
  constructor(width, height) {
    super("rect");
    this.sides = 4;
    this.width = width;
    this.height = height;
  }
  area() {
    return this.width * this.height;
  }
}

class Square extends Rect {
  constructor(size) {
    super(size, size);
    this.name = "square";
    this.size = size;
  }
}

class Reporter {
  constructor() {
    this.log = [];
    this.report();
  }
  report() {
    this.log.push("base");
  }
}

class EarlyReporter extends Reporter {
  constructor() {
    super();
    this.label = "early";
    this.count = 1;
  }
  report() {
    console.log("before assignment:", this.label, this.count);
  }
}

const shapes = [new Shape("dot"), new Rect(2, 3), new Square(4)];
let total = 0;
for (let i = 0; i < shapes.length; i++) total += shapes[i].area();
for (let i = 0; i < shapes.length; i++) console.log(shapes[i].describe());
console.log(total, Object.keys(shapes[2]));
try {
  shapes[7].describe();
} catch (error) {
  console.log(error instanceof TypeError, error.message);
}
const reporter = new EarlyReporter();
reporter.report();
console.log(Object.keys(reporter));
