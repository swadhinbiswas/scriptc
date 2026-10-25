// assert.deepEqual and assert.notDeepEqual over statically typed values:
// numbers, strings, records, arrays, Maps, Sets, typed arrays and Buffers,
// and operands of different static types.
import assert from "node:assert";

function check(label: string, run: () => void): void {
  try {
    run();
    console.log(label, "pass");
  } catch (e) {
    if (e instanceof assert.AssertionError) {
      console.log(label, e.operator, e.generatedMessage, JSON.stringify(e.message));
    } else {
      throw e;
    }
  }
}

interface Point { x: number; y: number; label?: string }
const p1: Point = { x: 1, y: 2 };
const p2: Point = { x: 1, y: 2 };
const p3: Point = { x: 1, y: 3 };
const p4: Point = { x: 1, y: 2, label: "p" };

check("0 -0", () => assert.deepEqual(0, -0));
check("NaN", () => assert.deepEqual(NaN, NaN));
check("numbers unequal", () => assert.deepEqual(1, 2));
check("number string", () => assert.deepEqual(1, "1"));
check("number string unequal", () => assert.deepEqual(1, "2"));
check("boolean number", () => assert.deepEqual(true, 1));
check("records", () => assert.deepEqual(p1, p2));
check("records unequal", () => assert.deepEqual(p1, p3));
check("records optional", () => assert.deepEqual(p1, p4));
check("records not", () => assert.notDeepEqual(p1, p2));
check("records not unequal", () => assert.notDeepEqual(p1, p3));
check("arrays", () => assert.deepEqual([1, 2, 3], [1, 2, 3]));
check("arrays -0", () => assert.deepEqual([0], [-0]));
check("arrays unequal", () => assert.deepEqual([1, 2, 3], [1, 2, 4]));
check("arrays length", () => assert.deepEqual([1, 2], [1, 2, 3]));
check("nested", () => assert.deepEqual({ points: [p1, p2] }, { points: [p2, p1] }));
check("nested unequal", () => assert.deepEqual({ points: [p1] }, { points: [p3] }));
check("maps", () => assert.deepEqual(new Map([["a", 1]]), new Map([["a", 1]])));
check("maps unequal", () => assert.deepEqual(new Map([["a", 1]]), new Map([["a", 2]])));
check("sets", () => assert.deepEqual(new Set([1, 2]), new Set([2, 1])));
check("sets unequal", () => assert.deepEqual(new Set([1, 2]), new Set([1, 3])));
check("Float64Array", () => assert.deepEqual(new Float64Array([0, 1]), new Float64Array([-0, 1])));
check("Float64Array NaN", () => assert.deepEqual(new Float64Array([NaN]), new Float64Array([NaN])));
check("Uint8Array", () => assert.deepEqual(new Uint8Array([1, 2]), new Uint8Array([1, 2])));
check("Buffer Uint8Array", () => assert.deepEqual(Buffer.from([1, 2]), new Uint8Array([1, 2])));
check("Buffer unequal", () => assert.deepEqual(Buffer.from([1, 2]), Buffer.from([1, 3])));
check("message", () => assert.deepEqual(p1, p3, "points differ"));
check("not message", () => assert.notDeepEqual(p1, p2, "points match"));
const mixed: (number | string)[] = [1, "2"];
check("union array", () => assert.deepEqual(mixed, ["1", 2]));
check("union array unequal", () => assert.deepEqual(mixed, [1, "3"]));
