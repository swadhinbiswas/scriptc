// Arrays of interface values implemented by program classes and object
// literals: construction, index reads and writes, length, iteration,
// element identity, nested arrays, and calls through each element.
interface Shape {
  area(): number;
  name(): string;
}

class Circle implements Shape {
  r: number;
  constructor(r: number) {
    this.r = r;
  }
  area(): number {
    return 3 * this.r * this.r;
  }
  name(): string {
    return `circle ${this.r}`;
  }
}

class Square implements Shape {
  side: number;
  constructor(side: number) {
    this.side = side;
  }
  area(): number {
    return this.side * this.side;
  }
  name(): string {
    return `square ${this.side}`;
  }
}

const literal: Shape = {
  area(): number {
    return 100;
  },
  name(): string {
    return "literal";
  },
};

const first = new Circle(1);
const shapes: Shape[] = [first, new Square(2), literal];
console.log(shapes.length, shapes[0] === first, shapes[2] === literal);
for (const shape of shapes) console.log(shape.name(), shape.area());
for (let i = 0; i < shapes.length; i++) console.log(i, shapes[i]!.name());

shapes[1] = new Circle(4);
shapes.push(new Square(5));
console.log(shapes.map((s) => s.name()).join(", "));

const empty: Shape[] = [];
console.log(empty.length, empty[0] === undefined);
empty[2] = literal;
console.log(empty.length, empty[0] === undefined, empty[2] === literal);

const grid: Shape[][] = [shapes, [literal, first]];
console.log(grid.length, grid[1]![1] === first, grid[0]![3]!.name());

let total = 0;
for (let round = 0; round < 100; round++) for (const shape of shapes) total += shape.area();
console.log(total);

function largest(list: Shape[]): Shape | undefined {
  let best: Shape | undefined;
  for (const shape of list) if (best === undefined || shape.area() > best.area()) best = shape;
  return best;
}
const big = largest(shapes);
console.log(big === undefined ? "none" : big.name(), largest([]) === undefined);

function build(count: number): Shape[] {
  const out: Shape[] = [];
  for (let i = 1; i <= count; i++) out.push(i % 2 === 0 ? new Square(i) : new Circle(i));
  return out;
}
console.log(build(4).map((s) => s.area()).join(" "));
