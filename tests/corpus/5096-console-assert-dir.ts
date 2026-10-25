// console.assert prints through warn only on a falsy value: string
// messages gain the "Assertion failed: " prefix (and still format), other
// first arguments follow a separate "Assertion failed"; every argument
// evaluates whether or not the assertion holds. console.dir is
// util.inspect with console.dir's options (strings quoted, depth and
// colors options), and dirxml is log.
function value(n: number): number {
  console.log("evaluated", n);
  return n;
}

console.assert(true);
console.assert(1, "never printed", value(1));
console.assert("non-empty", value(2));
console.assert(false);
console.assert(0, "zero is falsy");
console.assert("", "empty %s with %d args", "string", 2);
console.assert(null, "null is %s", "falsy", "extra", 3);
console.assert(undefined, 100);
console.assert(NaN, { reason: "NaN" }, [1, 2]);
console.assert(false, "message", value(3), { ok: false });
const message = process.argv.length > 99 ? "never" : "runtime message";
console.assert(false, message);
const flag = process.argv.length > 99;
console.assert(flag, "flag was %o", flag);
const items: number[] = [];
console.assert(items.length, "no items:", items);

console.dir("a string");
console.dir(42);
console.dir(-0);
console.dir(true);
console.dir(null);
console.dir(undefined);
console.dir();
console.dir([1, "two", [3, [4, [5, [6]]]]]);
console.dir({ a: { b: { c: { d: { e: 1 } } } } });
console.dir({ a: { b: { c: { d: { e: 1 } } } } }, { depth: 0 });
console.dir({ a: { b: { c: { d: { e: 1 } } } } }, { depth: null });
console.dir({ a: { b: { c: { d: { e: 1 } } } } }, { depth: 1, colors: false });
console.dir(new Map([["k", { v: [1, 2] }]]));
console.dir(new Set(["x", "y"]));
console.dir({ s: "quoted 'single'", n: 1.5, list: ["a", "b"] }, { customInspect: false });
function named(): void {}
console.dir(named);
console.dir(() => 1);
class Point {
  x: number;
  y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}
console.dir(new Point(1, 2));
console.dir(new Error("boom").message);
console.dirxml("dirxml %s", "formats", { like: "log" });
console.dirxml();
