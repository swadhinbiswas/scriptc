// deepEqual edge cases: errors, functions, values parsed from JSON
// against typed values, Map keys that are objects, Set members that only
// match loosely, and the strict module's aliasing.
import assert from "node:assert";
import strict from "node:assert/strict";

/** @param {string} label @param {() => void} run */
function check(label, run) {
  try {
    run();
    console.log(label, "pass");
  } catch (e) {
    const error = /** @type {any} */ (e);
    console.log(label, error.operator, error.generatedMessage, JSON.stringify(error.message));
  }
}

check("errors", () => assert.deepEqual(new Error("x"), new Error("x")));
check("errors message", () => assert.deepEqual(new Error("x"), new Error("y")));
check("errors name", () => assert.deepEqual(new TypeError("x"), new RangeError("x")));
const fn = () => 1;
check("functions same", () => assert.deepEqual(fn, fn));
check("functions different", () => assert.deepEqual(fn, () => 1));
const parsed = JSON.parse('{"a":1,"b":["2",3]}');
check("parsed vs literal", () => assert.deepEqual(parsed, { a: "1", b: [2, 3] }));
check("parsed vs literal unequal", () => assert.deepEqual(parsed, { a: 1, b: [2, 4] }));
check("map object keys", () => assert.deepEqual(new Map([[{ k: 1 }, "v"]]), new Map([[{ k: "1" }, "v"]])));
check("map object keys unequal", () => assert.deepEqual(new Map([[{ k: 1 }, "v"]]), new Map([[{ k: 2 }, "v"]])));
check("map undefined null", () => assert.deepEqual(new Map([[undefined, 1]]), new Map([[null, 1]])));
check("set loose members", () => assert.deepEqual(new Set([1, 2, 3]), new Set(["3", "2", "1"])));
check("set loose members unequal", () => assert.deepEqual(new Set([1, 2, 3]), new Set(["3", "2", "4"])));
check("set null undefined", () => assert.deepEqual(new Set([null]), new Set([undefined])));
check("set non-transitive", () => assert.deepEqual(new Set(["", "0", 0]), new Set([0, "", "0"])));
check("set three objects", () => assert.deepEqual(new Set([{ a: 1 }, { a: 2 }, { a: 3 }]), new Set([{ a: "3" }, { a: "1" }, { a: "2" }])));
check("regexps", () => assert.deepEqual(/a/g, /a/g));
check("regexps flags", () => assert.deepEqual(/a/g, /a/i));
check("strict module", () => strict.deepEqual([1], [2]));
check("strict module not", () => strict.notDeepEqual([1], [1]));
check("not with empty message", () => assert.notDeepEqual(1, 1, ""));
check("nested arrays null", () => assert.deepEqual([[1, 2]], [[1, null]]));
check("long", () => assert.deepEqual({ text: "x".repeat(600) }, { text: "y" }));
