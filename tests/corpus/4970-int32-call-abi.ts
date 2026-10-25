// Number parameters and results proven int32 at every direct call: plain
// and counting-down recursion, mutual recursion, constructors and methods,
// helpers that also escape as values (closures, callbacks, virtual
// dispatch), exceptions and finally blocks through int32 calls, Int32
// contracts, and call sites that pass -0, NaN, fractions or uint32 values,
// which keep their numbers.
import type { Int32 } from "@scriptc/types";

function show(label: string, value: number): void {
  console.log(label, value, Object.is(value, -0) ? "negative zero" : "");
}

function fib(n: number): number {
  return n < 2 ? n : fib(n - 1) + fib(n - 2);
}

function ack(m: number, n: number): number {
  if (m === 0) return n + 1;
  if (n === 0) return ack(m - 1, 1);
  return ack(m - 1, ack(m, n - 1));
}

class TreeNode {
  left: TreeNode | null;
  right: TreeNode | null;
  depth: number;
  constructor(left: TreeNode | null, right: TreeNode | null, depth: number) {
    this.left = left;
    this.right = right;
    this.depth = depth;
  }
}
function make(d: number): TreeNode {
  return d === 0 ? new TreeNode(null, null, 0) : new TreeNode(make(d - 1), make(d - 1), d);
}
function count(node: TreeNode | null): number {
  return node === null ? 0 : 1 + count(node.left) + count(node.right);
}

// Results that are int32 by construction.
function mix(x: number, y: number, depth: number): number {
  if (depth > 0) return mix((x ^ y) | 0, (y + 0x9e37) | 0, depth - 1);
  return (Math.imul(x, 31) + y) | 0;
}
function h32(x: number): number {
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
  return (x ^ (x >>> 16)) | 0;
}

// Mutual recursion that counts down.
function isEven(n: number): boolean {
  return n === 0 ? true : isOdd(n - 1);
}
function isOdd(n: number): boolean {
  return n === 0 ? false : isEven(n - 1);
}

// A helper called directly and also used as a value.
function square(n: number): number {
  return (n * n) | 0;
}

// Virtual dispatch reaches the same int32 results.
class Shape {
  area(scale: number): number {
    return scale | 0;
  }
}
class Box extends Shape {
  side: number;
  constructor(side: number) {
    super();
    this.side = side;
  }
  override area(scale: number): number {
    return Math.imul(this.side, this.side) * scale;
  }
}

// Methods called directly with int32 arguments.
class Counter {
  total = 0;
  add(step: number, times: number): number {
    for (let i = 0; i < times; i++) this.total = (this.total + step) | 0;
    return this.total;
  }
}

// Exceptions through int32 parameters and results.
function failAt(n: number, limit: number): number {
  if (n === limit) throw new Error("limit " + n);
  return n > 100 ? n : (failAt(n + 1, limit) + 1) | 0;
}
function finallyBump(n: number, log: number[]): number {
  try {
    if (n > 3) return n | 0;
    return (finallyBump(n + 1, log) * 2) | 0;
  } finally {
    log.push(n);
  }
}

// Call sites that are not int32: the parameter keeps its number.
function keep(n: number): number {
  return n === 0 ? 1 / n : n * 2;
}

function withContract(a: Int32, b: Int32): Int32 {
  return (a + b) | 0;
}

function depth(n: number): number {
  return n === 0 ? 0 : 1 + depth(n - 1);
}

function main(): void {
  show("fib", fib(20));
  show("ack", ack(2, 3));
  show("ack3", ack(3, 3));
  const tree = make(10);
  show("tree", count(tree));
  show("tree depth", tree.depth);
  let h = 1;
  for (let i = 0; i < 1000; i++) h = (mix(h, i, i & 3) ^ (h >>> 3)) | 0;
  show("mix", h);
  let acc = 0;
  for (let i = -5; i < 2000; i++) acc = (acc + h32(i)) | 0;
  show("h32", acc);
  show("h32 min", h32(-2147483648));
  console.log("even", isEven(10), isOdd(7), isEven(3));

  show("square", square(46341));
  console.log("squares", [1, 2, 3, -4].map(square).join(","));
  const fn: (n: number) => number = square;
  show("square value", fn(12));

  const shapes: Shape[] = [new Shape(), new Box(3)];
  for (const s of shapes) show("area", s.area(2));
  show("direct area", new Shape().area(7));

  const c = new Counter();
  show("counter", c.add(5, 10));
  show("counter wrap", c.add(2147483647, 2));

  try {
    show("fail", failAt(0, 50));
  } catch (e) {
    console.log("caught", (e as Error).message);
  }
  show("no fail", failAt(0, -1));
  const log: number[] = [];
  show("finally", finallyBump(0, log));
  console.log("finally order", log.join(","));

  show("keep zero", keep(0));
  show("keep negative zero", keep(-0));
  show("keep fraction", keep(0.5));
  show("keep NaN", keep(NaN));
  show("keep uint32", keep(-1 >>> 0));
  show("keep big", keep(2 ** 40));

  show("contract", withContract(2147483647, 1));
  show("depth", depth(2000));
}

main();
