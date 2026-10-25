// Stack exhaustion through mutual recursion, closures, methods and
// callbacks throws the same catchable RangeError as direct recursion.
function isEven(n: number): boolean {
  return n === 0 ? true : isOdd(n - 1);
}
function isOdd(n: number): boolean {
  return n === 0 ? false : isEven(n - 1);
}

function ping(n: number): number {
  return pong(n + 1) + 1;
}
function pong(n: number): number {
  return ping(n + 1) + 1;
}

function report(label: string, run: () => unknown): void {
  try {
    console.log(label, "returned", run());
  } catch (e) {
    console.log(label, e instanceof RangeError, (e as Error).message);
  }
}

report("mutual bounded", () => isEven(4000));
report("mutual unbounded", () => ping(0));

const countdown = (n: number): number => (n <= 0 ? 0 : countdown(n - 1) + 1);
report("closure bounded", () => countdown(3000));
let spiral: (n: number) => number = (n) => n;
spiral = (n) => spiral(n + 1) * 2;
report("closure unbounded", () => spiral(0));

function makeWalker(step: number): (n: number) => number {
  const walk = (n: number): number => walk(n + step) + 1;
  return walk;
}
report("captured unbounded", () => makeWalker(2)(0));

class Shape {
  readonly sides: number;
  constructor(sides: number) {
    this.sides = sides;
  }
  grow(n: number): number {
    return n === 0 ? this.sides : this.grow(n - 1) + 1;
  }
  forever(n: number): number {
    return this.forever(n + 1) + this.sides;
  }
}
class Square extends Shape {
  constructor() {
    super(4);
  }
  forever(n: number): number {
    return super.forever(n + 1) + 1;
  }
}
const square = new Square();
report("method bounded", () => square.grow(2500));
report("method unbounded", () => square.forever(0));

interface Tree {
  value: number;
  children: Tree[];
}
function chain(depth: number): Tree {
  let node: Tree = { value: 0, children: [] };
  for (let i = 1; i <= depth; i++) node = { value: i, children: [node] };
  return node;
}
function total(tree: Tree): number {
  return tree.value + tree.children.map(total).reduce((a, b) => a + b, 0);
}
report("callback bounded", () => total(chain(1500)));
function spin(values: number[]): number {
  return values.map(() => spin(values)).length;
}
report("callback unbounded", () => spin([1]));

const looping: { next: () => number } = { next: () => looping.next() + 1 };
report("object member unbounded", () => looping.next());
console.log("done", isOdd(3001), countdown(10));
