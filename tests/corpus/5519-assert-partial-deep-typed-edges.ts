// partialDeepStrictEqual's typed comparison at its edges: optional
// fields present with undefined, union elements, nested subsequences,
// expected fields the actual type lacks, signed zero and NaN, and fields
// typed unknown.
import assert from "node:assert";

function check(label: string, run: () => void): void {
  try {
    run();
    console.log(label, "pass");
  } catch (e) {
    if (e instanceof assert.AssertionError) {
      console.log(label, e.generatedMessage, JSON.stringify(e.message));
    } else {
      throw e;
    }
  }
}

interface Opt { a: number; b?: string }
const withUndefined: Opt = { a: 1, b: undefined };
const without: Opt = { a: 1 };
check("present undefined vs absent", () => assert.partialDeepStrictEqual(withUndefined, without));
check("absent vs present undefined", () => assert.partialDeepStrictEqual(without, withUndefined));
check("present undefined both", () => assert.partialDeepStrictEqual(withUndefined, withUndefined));

const mixed: (number | string | null)[] = [1, "2", null, 3];
const mixedPart: (number | string | null)[] = ["2", 3];
const mixedWrong: (number | string | null)[] = [2, 3];
check("union array", () => assert.partialDeepStrictEqual(mixed, mixedPart));
check("union array kinds", () => assert.partialDeepStrictEqual(mixed, mixedWrong));
const withNull: (number | string | null)[] = [null];
check("union array null", () => assert.partialDeepStrictEqual(mixed, withNull));

interface Row { id: number; cells: number[] }
const table: Row[] = [
  { id: 1, cells: [1, 2, 3] },
  { id: 2, cells: [4, 5, 6] },
];
check("nested subsequence", () => assert.partialDeepStrictEqual(table, [{ cells: [5] }]));
check("nested subsequence unequal", () => assert.partialDeepStrictEqual(table, [{ cells: [6, 4] }]));

interface Narrow { a: number }
interface Wide { a: number; extra: string }
const narrow: Narrow = { a: 1 };
const wide: Wide = { a: 1, extra: "x" };
check("expected field missing from actual type", () => assert.partialDeepStrictEqual(narrow, wide));
check("actual wider", () => assert.partialDeepStrictEqual(wide, narrow));

check("signed zero", () => assert.partialDeepStrictEqual([0], [-0]));
check("NaN", () => assert.partialDeepStrictEqual([NaN, 1], [NaN]));
const none: number[] = [];
check("empty expected array", () => assert.partialDeepStrictEqual([1, 2], none));
check("empty actual array", () => assert.partialDeepStrictEqual(none, [1]));
check("strings", () => assert.partialDeepStrictEqual({ s: "abc" }, { s: "abd" }));
check("booleans", () => assert.partialDeepStrictEqual({ t: true, f: false }, { f: false }));

interface Holder { label: string; data: unknown }
const holder: Holder = { label: "h", data: JSON.parse('{"x":1,"y":[1,2]}') };
check("unknown field", () => assert.partialDeepStrictEqual(holder, { data: { y: [2] } }));
check("unknown field unequal", () => assert.partialDeepStrictEqual(holder, { data: { y: [3] } }));
const maps = { m: new Map([["k", 1], ["j", 2]]) };
check("map field", () => assert.partialDeepStrictEqual(maps, { m: new Map([["j", 2]]) }));
check("map field unequal", () => assert.partialDeepStrictEqual(maps, { m: new Map([["j", 3]]) }));
