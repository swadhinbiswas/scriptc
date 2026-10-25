// Record views of class instances that nothing can tell apart from copies
// stay native records; any observation keeps the view the instance itself.
class Config {
  readonly name: string;
  readonly depth: number;
  constructor(name: string, depth: number) {
    this.name = name;
    this.depth = depth;
  }
}
interface Named {
  readonly name: string;
  readonly depth: number;
}
// A readonly view only read field by field.
function describe(n: Named | undefined): string {
  return n === undefined ? "none" : `${n.name}:${n.depth}`;
}
const configs = [new Config("a", 1), new Config("b", 2)];
const views: Named[] = configs;
console.log(views.map(describe).join(","), describe(undefined));

// A view passed on to a parameter that writes through its own type.
class Point {
  x = 1;
  y = 2;
}
type XY = { x: number; y: number };
function bump(o: { x: number }): void {
  o.x++;
}
const p = new Point();
const view: XY = p;
bump(view);
console.log("write through second view", p.x);

// Identity compared inside a generic function.
type Pair = { readonly x: number; readonly y: number };
function same<V>(a: V, b: V): boolean {
  return a === b;
}
const q = new Point();
const first: Pair = q;
const second: Pair = q;
console.log("generic identity", same(first, second));

// A view handed to an unknown parameter and printed there.
type Label = { readonly label: string };
class Tag {
  readonly label = "t";
  readonly extra = 42;
}
function show(value: unknown): void {
  console.log(value);
}
const tag: Label = new Tag();
show(tag);

// A getter on the class: every read runs it.
let reads = 0;
class Counter {
  get n(): number {
    return ++reads;
  }
}
type HasN = { readonly n: number };
const counted: HasN = new Counter();
console.log("getter", counted.n, counted.n, reads);

// A field the class writes after construction: a later read sees it.
class Box {
  value = 1;
  set(v: number): void {
    this.value = v;
  }
}
type Value = { readonly value: number };
const box = new Box();
const boxed: Value = box;
box.set(5);
console.log("later write", boxed.value);
