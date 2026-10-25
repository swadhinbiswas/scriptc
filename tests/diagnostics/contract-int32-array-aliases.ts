// Every reference to an array that can reach an Int32[] slot is checked:
// a captured binding, a class field, a function result, a nested array, a
// Map value, arrays whose elements a spread copies in (also through an
// alias), and a copy that is changed before its elements are copied back.
import type { Int32 } from "@scriptc/types";

class Holder {
  values: number[] = [];
}

function same(xs: number[]): number[] {
  return xs;
}

function viaSnapshot(xs: Int32[]): void {
  const snapshot = xs.slice();
  snapshot[0] = 0.5;
  xs[0] = snapshot[0];
}

const ids: Int32[] = [1, 2, 3];
const bump = (): void => {
  ids[0] = ids[0] + 0.5;
};
const holder = new Holder();
const held: Int32[] = holder.values;
holder.values.push(1 / 3);
same(ids).unshift(-0.25);
const grid: number[][] = [ids];
grid[0][1] = 1e10;
const byName = new Map<string, number[]>([["ids", ids]]);
byName.get("ids")!.fill(NaN);
const extra = [7, 8.5];
ids.push(...extra);
const view: number[] = ids;
const more = [0.75];
view.unshift(...more);
bump();
viaSnapshot(ids);
console.log(ids, held, grid.length, byName.size);
