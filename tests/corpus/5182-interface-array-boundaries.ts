// Arrays of interface values crossing into untyped code and JSON, and
// stored in class fields and records: the untyped view is the same array,
// writes through either side are visible to the other, and elements keep
// their identity.
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

class Square implements Shape {
  side: number;
  constructor(side: number) {
    this.side = side;
  }
  area(): number {
    return this.side * this.side;
  }
}

const shapes: Shape[] = [new Circle(1), new Square(2)];
const view: unknown = shapes;
console.log(Array.isArray(view), view === shapes);
const untyped = view as unknown[];
untyped.push(new Square(3));
console.log(shapes.length, shapes[2]!.area());
shapes.push(new Circle(2));
console.log(untyped.length);

function describe(value: unknown): string {
  return JSON.stringify(value);
}
console.log(describe(shapes));
console.log(JSON.stringify({ shapes }));

class Scene {
  items: Shape[] = [];
  add(shape: Shape): this {
    this.items.push(shape);
    return this;
  }
  total(): number {
    let sum = 0;
    for (const item of this.items) sum += item.area();
    return sum;
  }
}
const scene = new Scene().add(shapes[0]!).add(new Square(4));
console.log(scene.items.length, scene.total(), scene.items[0] === shapes[0]);
scene.items = shapes;
console.log(scene.total(), scene.items === shapes);

type Layer = { name: string; shapes: Shape[] };
const layer: Layer = { name: "base", shapes };
layer.shapes.push(new Square(1));
console.log(shapes.length, layer.shapes === shapes);

const parsed = JSON.parse("[1, 2]") as unknown[];
console.log(parsed.length);

shapes.length = 1;
console.log(shapes.length, (view as unknown[]).length);
