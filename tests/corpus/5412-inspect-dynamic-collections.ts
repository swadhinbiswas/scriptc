// util.inspect of Maps and Sets held in untyped values: sizes, entries,
// nesting, class-instance members, the depth limit and the 100-entry limit.
import { inspect } from "node:util";

class Point {
  x: number;
  y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

const set: unknown = new Set([1, "two", true]);
const map: unknown = new Map<unknown, unknown>([
  ["a", 1],
  [2, "b"],
]);
console.log(set);
console.log(map);
console.log([set, map]);
console.log({ set, map });
console.log(inspect(new Set<unknown>()), inspect(new Map<unknown, unknown>()));

const points: unknown = new Set([new Point(1, 2), new Point(3, 4)]);
console.log(points);
const byPoint = new Map<unknown, unknown>([[new Point(0, 0), new Set([new Point(1, 1)])]]);
console.log(byPoint);
console.log(new Map<number, unknown>([[1, new Set([1])]]));

const deep: unknown = new Map<unknown, unknown>([["k", new Map([["k2", new Set([1, 2])]])]]);
console.log(inspect(deep, { depth: 0 }), inspect(deep, { depth: 1 }), inspect(deep));

const many: unknown = new Set(Array.from({ length: 105 }, (_, i) => i));
console.log(many);
