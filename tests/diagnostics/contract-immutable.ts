// Immutable contracts that do not hold: writes that reach the value
// through methods, aliases and casts, and stores of values that other
// references can still change.
import type { Immutable } from "@scriptc/types";

class Counter {
  count = 0;
  bump(): void {
    this.count++;
  }
}

const COUNTER: Immutable<Counter> = new Counter();

const shared = [1, 2, 3];
const VIEW: Immutable<number[]> = shared;

const ROWS: Immutable<number[][]> = [[1], [2]];

const CONFIG: Immutable<{ name: string }> = { name: "x" };

function rename(config: { name: string }): void {
  config.name = "y";
}

function grow(rows: number[][]): void {
  rows[0]!.push(4);
}

COUNTER.bump();
rename(CONFIG);
grow(ROWS as number[][]);
shared.push(4);
console.log(COUNTER.count, VIEW.length, ROWS.length, CONFIG.name);

// A write at an index that may be negative, fractional or too large adds a
// property instead of an element, so the factory's result is not fresh.
function fill(at: number): number[] {
  const table: number[] = [];
  for (let i = 0; i < 4; i++) table[i] = i;
  table[at] = -1;
  return table;
}

const FILLED: Immutable<number[]> = fill(-1);
console.log(FILLED.length);
