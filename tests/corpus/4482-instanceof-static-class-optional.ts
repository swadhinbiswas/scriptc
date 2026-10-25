// `x instanceof C` where x may hold undefined at run time (an unchecked
// array read or a parameter fed one) and C is a plain class reference.
// Missing values answer false; present values test their class chain.
// Results must match Node in every combination.

class Shape {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
}
class Circle extends Shape {
  radius: number;
  constructor(radius: number) {
    super("circle");
    this.radius = radius;
  }
}
class Square extends Shape {
  side: number;
  constructor(side: number) {
    super("square");
    this.side = side;
  }
}
class Unit extends Square {
  constructor() {
    super(1);
  }
}

function classify(shape: Shape): string {
  if (shape instanceof Unit) return "unit";
  if (shape instanceof Circle) return "circle r=" + shape.radius;
  if (shape instanceof Square) return "square s=" + shape.side;
  if (shape instanceof Shape) return "shape " + shape.name;
  return "missing";
}

const shapes: Shape[] = [new Circle(2), new Square(3), new Unit(), new Shape("plain")];
shapes[6] = new Circle(9);
for (let i = 0; i < 8; i++) console.log(i, classify(shapes[i]));

// Direct tests on unchecked reads, including in a loop and in conditions.
let circles = 0;
let squares = 0;
let missing = 0;
for (let i = 0; i < shapes.length + 2; i++) {
  const s = shapes[i];
  if (s instanceof Circle) circles++;
  else if (s instanceof Square) squares++;
  else if (!(s instanceof Shape)) missing++;
}
console.log("counts", circles, squares, missing);

// The same class tested many times keeps the class object intact.
let hits = 0;
for (let round = 0; round < 1000; round++) {
  for (const s of shapes) if (s instanceof Square) hits++;
}
console.log("hits", hits, shapes[1] instanceof Square, shapes[0] instanceof Square);

// A class held in a variable still dispatches through the value.
const kind = Square;
console.log(kind.name, shapes[1] instanceof kind, shapes[5] instanceof kind, shapes[6] instanceof kind);
