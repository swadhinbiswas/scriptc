// Loops over arrays of interface values whose method calls change the
// array: an implementation clears, splices, refills or replaces the array
// being iterated, or the variable that holds it. Each call still runs on
// the element it was made on, and the loop sees the array's new contents.
interface Shape {
  area(): number;
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

let shapes: Shape[] = [];
const clearing: Shape = {
  area(): number {
    shapes.length = 0;
    shapes = [];
    return 1000;
  },
};
const splicing: Shape = {
  area(): number {
    shapes.splice(0, shapes.length, new Square(9));
    return 100;
  },
};
const growing: Shape = {
  area(): number {
    if (shapes.length < 6) shapes.push(new Square(shapes.length));
    return 10;
  },
};

function total(list: Shape[]): number {
  let sum = 0;
  for (const shape of list) sum += shape.area();
  return sum;
}

shapes = [new Square(1), clearing, new Square(2)];
console.log(total(shapes), shapes.length);
shapes = [new Square(1), splicing, new Square(2), new Square(3)];
const spliced = shapes;
console.log(total(shapes), spliced.length, spliced[0] === shapes[0]);
shapes = [growing, new Square(2)];
console.log(total(shapes), shapes.length);

// A getter-backed method that removes the element it belongs to.
class Removing implements Shape {
  get area(): () => number {
    shapes.splice(shapes.indexOf(this), 1);
    return () => 5;
  }
}
shapes = [new Square(1), new Removing(), new Square(2), new Square(3)];
console.log(total(shapes), shapes.length);

// Many rounds, so released elements would be reused if a call kept a
// stale element.
let checksum = 0;
for (let round = 0; round < 200; round++) {
  shapes = [new Square(round % 7), clearing, new Square(3)];
  checksum += total(shapes);
}
console.log(checksum);
