// Method calls through a base-typed receiver when only some classes in the
// hierarchy are ever constructed: an abstract base with one constructed
// implementation, a concrete base reached only through super(), classes
// constructed through class values, generic subclasses, Error subclasses,
// accessors, template methods, and super calls. Classes declared but never
// constructed or referenced stay out of the program.

// Abstract base: Square is declared but never constructed.
abstract class Shape {
  abstract area(x: number): number;
  describe(): string {
    return `area(2)=${this.area(2)}`;
  }
}
class Circle extends Shape {
  r = 2;
  area(x: number): number {
    return x * this.r + 1;
  }
}
class Square extends Shape {
  s = 3;
  area(x: number): number {
    return x * this.s;
  }
}
function makeShape(): Shape {
  return new Circle();
}
function sumAreas(s: Shape, n: number): number {
  let t = 0;
  for (let i = 0; i < n; i++) t += s.area(i & 7);
  return t;
}
console.log(sumAreas(makeShape(), 100), makeShape().describe());

// Concrete base never constructed itself: its constructor runs only
// through super().
class Counter {
  base = 10;
  label: string;
  constructor(label: string) {
    this.label = label;
  }
  step(x: number): number {
    return x + this.base;
  }
  get kind(): string {
    return "counter";
  }
}
class Doubler extends Counter {
  constructor() {
    super("doubler");
  }
  step(x: number): number {
    return 2 * x + super.step(0);
  }
  get kind(): string {
    return `doubling ${super.kind}`;
  }
}
function runCounter(c: Counter): string {
  let t = 0;
  for (let i = 0; i < 5; i++) t += c.step(i);
  return `${c.label} ${c.kind} ${t}`;
}
console.log(runCounter(new Doubler()));

// Middle class inherits the only implementation from the root.
class Animal {
  sound(): string {
    return "...";
  }
}
class Dog extends Animal {
  sound(): string {
    return "woof";
  }
}
class Puppy extends Dog {}
class Cat extends Animal {
  sound(): string {
    return "meow";
  }
}
const animals: Animal[] = [new Puppy(), new Puppy()];
console.log(animals.map((a) => a.sound()).join(" "));

// Two constructed implementations keep dynamic dispatch.
abstract class Op {
  abstract apply(x: number): number;
}
class Inc extends Op {
  apply(x: number): number {
    return x + 1;
  }
}
class Neg extends Op {
  apply(x: number): number {
    return -x;
  }
}
const ops: Op[] = [new Inc(), new Neg(), new Inc()];
console.log(ops.reduce((acc, op) => op.apply(acc), 5));

// Construction through a class value counts as construction.
abstract class Greeter {
  abstract greet(): string;
}
class Hello extends Greeter {
  greet(): string {
    return "hello";
  }
}
class Hi extends Greeter {
  greet(): string {
    return "hi";
  }
}
function construct(k: typeof Greeter2): Greeter {
  return new k();
}
class Greeter2 extends Greeter {
  greet(): string {
    return "greeter2";
  }
}
class Hey extends Greeter2 {
  greet(): string {
    return "hey";
  }
}
function greetWith(g: Greeter): string {
  return g.greet();
}
console.log(greetWith(construct(Hey)), greetWith(new Hello()));

// Generic subclasses.
abstract class Box<T> {
  value: T;
  constructor(value: T) {
    this.value = value;
  }
  abstract show(): string;
}
class NumBox extends Box<number> {
  show(): string {
    return `n:${this.value}`;
  }
}
class StrBox extends Box<string> {
  show(): string {
    return `s:${this.value}`;
  }
}
const boxes: Box<number>[] = [new NumBox(4)];
console.log(boxes.map((b) => b.show()).join());

// Template method: the base loop calls this.step() on the only
// constructed subclass.
abstract class Task {
  run(n: number): number {
    let t = 0;
    for (let i = 0; i < n; i++) t += this.step(i);
    return t;
  }
  abstract step(i: number): number;
}
class SquareTask extends Task {
  step(i: number): number {
    return i * i;
  }
}
class CubeTask extends Task {
  step(i: number): number {
    return i * i * i;
  }
}
console.log(new SquareTask().run(10));

// Error subclasses with an overridden method.
class AppError extends Error {
  code(): number {
    return 1;
  }
}
class NotFound extends AppError {
  code(): number {
    return 404;
  }
}
function codeOf(e: AppError): number {
  return e.code();
}
try {
  throw new NotFound("missing");
} catch (e) {
  if (e instanceof AppError) console.log(codeOf(e), e.message);
}

// Abstract accessor with one constructed implementation.
abstract class Named {
  abstract get name(): string;
  abstract set name(v: string);
}
class Person extends Named {
  private n = "ann";
  get name(): string {
    return this.n;
  }
  set name(v: string) {
    this.n = v.toUpperCase();
  }
}
class Robot extends Named {
  get name(): string {
    return "robot";
  }
  set name(_v: string) {}
}
const who: Named = new Person();
who.name = "bob";
console.log(who.name);

// A second implementation constructed only on a path that runs later.
abstract class Reader {
  abstract read(): string;
}
class FileReader extends Reader {
  read(): string {
    return "file";
  }
}
class NetReader extends Reader {
  read(): string {
    return "net";
  }
}
function pick(flag: boolean): Reader {
  return flag ? new NetReader() : new FileReader();
}
console.log(pick(false).read(), pick(true).read());
