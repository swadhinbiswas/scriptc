// Array methods on arrays of interface values: searches compare element
// identity, sorting and splicing move the same objects, copies share
// elements with the source, and iterator methods yield the elements.
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
    return `c${this.r}`;
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
    return `s${this.side}`;
  }
}

const literal: Shape = { area: () => 50, name: () => "lit" };
const a = new Circle(1);
const b = new Square(3);
const shapes: Shape[] = [a, b, literal, new Circle(2)];
const names = (list: Shape[]): string => list.map((s) => s.name()).join(" ");

console.log(shapes.indexOf(b), shapes.indexOf(new Square(3)), shapes.lastIndexOf(a));
console.log(shapes.includes(literal), shapes.includes(new Circle(1)));
const found = shapes.find((s) => s.area() > 10);
console.log(found === undefined ? "none" : found.name(), shapes.findIndex((s) => s === literal));
console.log(shapes.findLastIndex((s) => s.area() < 20));
console.log(shapes.filter((s) => s.area() < 20).map((s) => s.name()).join(","));
console.log(shapes.some((s) => s === b), shapes.every((s) => s.area() > 1));
console.log(shapes.reduce((sum, s) => sum + s.area(), 0), shapes.reduceRight((acc, s) => acc + s.name(), ""));
const last = shapes.at(-1);
console.log(last === undefined ? "none" : last.name());

const sorted = shapes.toSorted((x, y) => x.area() - y.area());
console.log(names(sorted), names(shapes), sorted[0] === a);
shapes.sort((x, y) => y.area() - x.area());
console.log(names(shapes));
console.log(names(shapes.toReversed()), names(shapes.slice(1, 3)));
console.log(names(shapes.with(0, literal)), names(shapes.toSpliced(1, 2)));
const removed = shapes.splice(1, 1, new Square(7), new Square(8));
console.log(names(removed), names(shapes));
console.log(names(shapes.concat([a], [literal])));
shapes.reverse();
const shifted = shapes.shift();
const popped = shapes.pop();
console.log(names(shapes), shifted === undefined ? "none" : shifted.name(), popped === undefined ? "none" : popped.name());
shapes.unshift(b);
console.log(names(shapes), shapes.length);
console.log(shapes.flatMap((s) => [s.name(), s.area()]).join("|"));
for (const [i, s] of shapes.entries()) console.log(i, s.name());
for (const s of shapes.values()) console.log(s.area());
console.log([...shapes.keys()].join(","));
const copy = [...shapes, literal];
const [head, ...rest] = copy;
console.log(head === shapes[0], rest.length, names(copy));
shapes.fill(literal, 1, 2);
shapes.copyWithin(0, 2);
console.log(names(shapes));
