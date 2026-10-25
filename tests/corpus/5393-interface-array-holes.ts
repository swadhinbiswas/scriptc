// Arrays of interface values with holes and undefined entries written by
// untyped code, read by loops, index reads and array methods.
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

const shapes: Shape[] = [new Square(1), new Square(2)];
function extend(view: unknown): void {
  const array = view as unknown[];
  array.length = 5;
  array[3] = undefined;
  array[4] = new Square(4);
}
extend(shapes);

let present = 0;
let missing = 0;
for (const shape of shapes) {
  if (shape === undefined) missing++;
  else present += shape.area();
}
console.log(shapes.length, present, missing);
console.log(2 in shapes, 3 in shapes, shapes[2] === undefined, shapes[4]!.area());
console.log(shapes.filter((s) => s !== undefined).length);
const areas: number[] = [];
shapes.forEach((s) => areas.push(s === undefined ? -1 : s.area()));
console.log(areas.join(","));
console.log(JSON.stringify(shapes));

function areaSum(list: Shape[]): number {
  let sum = 0;
  for (const shape of list) sum += shape === undefined ? -1 : shape.area();
  return sum;
}
console.log(areaSum(shapes));
