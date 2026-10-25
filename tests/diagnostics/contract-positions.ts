// Contract types are checked where they annotate a declaration directly
// (Int32 also as the element type of a declared array, Int32[]).
// Elsewhere they would promise something scriptc does not check, so the
// build reports them.
import type { Immutable, Int32, NoThrow } from "@scriptc/types";

type NodeId = Int32;

interface Point {
  x: Int32;
}

const ids: Int32[][] = [[1, 2]];
const point: Point = { x: 1 };
const id: NodeId = 3;
const callback: (x: number) => NoThrow<number> = (x) => x;
const table: Map<string, Immutable<number[]>> = new Map();
let last: NoThrow<number> = 0;

console.log(ids, point.x, id, callback(1), table.size, last);
