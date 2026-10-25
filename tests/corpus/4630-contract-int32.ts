// Int32 contract types (@scriptc/types): every value stored into an Int32
// slot is an int32 by construction, so Node computes the same values and
// scriptc stores the slots as 32-bit integers. `import type` is erased:
// Node never loads the package.
import type { Int32 } from "@scriptc/types";

class Cursor {
  pos: Int32 = 0;
  end: Int32;
  readonly id: Int32;
  constructor(end: Int32, id: Int32) {
    this.end = end;
    this.id = id;
  }
  advance(n: Int32): void {
    this.pos = (this.pos + n) | 0;
  }
  atEnd(): boolean {
    return this.pos >= this.end;
  }
}

class Shape {
  area(scale: Int32): Int32 {
    return scale & 0;
  }
}

class Square extends Shape {
  side: Int32;
  constructor(side: Int32) {
    super();
    this.side = side;
  }
  override area(scale: Int32): Int32 {
    return Math.imul(Math.imul(this.side, this.side), scale);
  }
}

function fnv1a(text: string): Int32 {
  let h: Int32 = 0x811c9dc5 | 0;
  for (let i: Int32 = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  }
  return h;
}

function clamp(i: Int32, lo: Int32, hi: Int32): Int32 {
  return i < lo ? lo : i > hi ? hi : i;
}

let nextId: Int32 = 0;
function allocateId(): Int32 {
  nextId = (nextId + 1) | 0;
  return nextId;
}

function total(values: number[]): Int32 {
  let sum: Int32 = 0;
  values.forEach((v) => {
    sum = (sum + v) | 0;
  });
  return sum;
}

function countdown(from: Int32): Int32 {
  let steps: Int32 = 0;
  for (let i: Int32 = from; i > 0; i--) steps = (steps + 1) | 0;
  return steps;
}

const cursor = new Cursor(10, allocateId());
while (!cursor.atEnd()) cursor.advance(3);
console.log("cursor", cursor.pos, cursor.end, cursor.id);

const shapes: Shape[] = [new Shape(), new Square(7), new Square(46341)];
for (const s of shapes) console.log("area", s.area(2));

console.log("fnv1a", fnv1a(""), fnv1a("scriptc"), fnv1a("contract types"));
console.log("clamp", clamp(-5, 0, 9), clamp(4, 0, 9), clamp(99, 0, 9));
console.log("ids", allocateId(), allocateId());
console.log("total", total([1, 2.5, 2147483647, 3]));
console.log("wrap", (2147483647 + 1) | 0, ~0, -1 >>> 28 | 0);
console.log("countdown", countdown(5), countdown(-3));
const big = new Cursor(2147483647, -2147483648);
big.advance(2147483647);
big.advance(1);
console.log("big", big.pos, big.end, big.id, big.atEnd());
