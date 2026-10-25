// node:assert's Assert class with skipPrototype: deepStrictEqual and
// notDeepStrictEqual compare own properties without the prototype check.
// Operands of different static types (two classes, a class and a record)
// compare as checked-dynamic values; errors still compare name and message;
// typed arrays still compare their element kind; Buffer and Uint8Array
// compare by content.
import { Assert, AssertionError } from "node:assert";

class Point {
  x: number;
  y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}
class Vector {
  x: number;
  y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}
interface Shape {
  name: string;
  at: Point;
}
interface Arrow {
  name: string;
  at: Vector;
}

const skip = new Assert({ skipPrototype: true });
const checked = new Assert();
const looseSkip = new Assert({ strict: false, skipPrototype: true });

function attempt(label: string, fn: () => void): void {
  try {
    fn();
    console.log(label, "passed");
  } catch (e) {
    if (!(e instanceof AssertionError)) throw e;
    console.log(label, e.operator, e.generatedMessage);
    console.log(e.message);
  }
}

attempt("classes", () => skip.deepStrictEqual(new Point(1, 2), new Vector(1, 2)));
attempt("classes differ", () => skip.deepStrictEqual(new Point(1, 2), new Vector(1, 3)));
attempt("class and record", () => skip.deepStrictEqual(new Point(1, 2), { x: 1, y: 2 }));
attempt("record and class", () => skip.deepStrictEqual({ x: 1, y: 3 }, new Point(1, 2)));
const shape: Shape = { name: "s", at: new Point(0, 0) };
const arrow: Arrow = { name: "s", at: new Vector(0, 0) };
attempt("nested classes", () => skip.deepStrictEqual(shape, arrow));
attempt("nested arrays", () => skip.deepStrictEqual([new Point(1, 1)], [new Vector(1, 1)]));
attempt("same class", () => skip.deepStrictEqual(new Point(1, 2), new Point(1, 2)));
attempt("same class differs", () => skip.deepStrictEqual(new Point(1, 2), new Point(2, 2)));
attempt("not classes", () => skip.notDeepStrictEqual(new Point(1, 2), new Vector(1, 2)));
attempt("not classes differ", () => skip.notDeepStrictEqual(new Point(1, 2), new Vector(2, 2)));
attempt("strict alias", () => skip.deepEqual(new Point(1, 2), new Vector(1, 2)));
attempt("strict alias not", () => skip.notDeepEqual(new Point(1, 2), new Vector(1, 2)));
attempt("loose deepEqual", () => looseSkip.deepEqual(new Point(1, 2), new Vector(1, 2)));
attempt("partial", () => skip.partialDeepStrictEqual(new Point(1, 2), { x: 1 }));

const bytes = Buffer.from([1, 2, 3]);
const view = new Uint8Array([1, 2, 3]);
attempt("buffer and uint8array", () => skip.deepStrictEqual(bytes, view));
attempt("buffer and uint8array differ", () => skip.deepStrictEqual(bytes, new Uint8Array([1, 2])));
attempt("uint8array and int8array", () => skip.deepStrictEqual(view, new Int8Array([1, 2, 3])));
attempt("checked buffer and uint8array", () => checked.deepStrictEqual(bytes, view));

attempt("error classes", () => skip.deepStrictEqual(new TypeError("m"), new RangeError("m")));
attempt("error messages", () => skip.deepStrictEqual(new TypeError("m"), new TypeError("n")));
attempt("same errors", () => skip.deepStrictEqual(new TypeError("m"), new TypeError("m")));

const parsed: unknown = JSON.parse('{"x":1,"y":2}');
attempt("unknown and class", () => skip.deepStrictEqual(parsed, new Point(1, 2)));
attempt("with message", () =>
  skip.deepStrictEqual(new Point(1, 2), new Vector(2, 1), "points differ"),
);
