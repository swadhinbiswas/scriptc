// assert.deepEqual and assert.notDeepEqual over checked-dynamic values:
// Node's loose comparison (== for primitives, no prototype check, the
// array null rule, loose Map and Set matching) and its messages.
import assert from "node:assert";

/** @param {string} label @param {unknown} a @param {unknown} b */
function compare(label, a, b) {
  const left = /** @type {any} */ (a);
  const right = /** @type {any} */ (b);
  let equal = "equal";
  try {
    assert.deepEqual(left, right);
  } catch (e) {
    const error = /** @type {any} */ (e);
    equal = `unequal ${error.operator} ${error.generatedMessage} ${JSON.stringify(error.message)}`;
  }
  let notEqual = "different";
  try {
    assert.notDeepEqual(left, right);
  } catch (e) {
    const error = /** @type {any} */ (e);
    notEqual = `same ${error.operator} ${JSON.stringify(error.message)}`;
  }
  console.log(label, "|", equal, "|", notEqual);
}

compare("1 '1'", 1, "1");
compare("0 -0", 0, -0);
compare("NaN NaN", NaN, NaN);
compare("true 1", true, 1);
compare("null undefined", null, undefined);
compare("null 0", null, 0);
compare("1 [1]", 1, [1]);
compare("strings", "a", "b");
compare("[1] [null]", [1], [null]);
compare("[null] [1]", [null], [1]);
compare("[undefined] [null]", [undefined], [null]);
compare("[1,2] ['1',2]", [1, 2], ["1", 2]);
compare("[1,2] [1,2,3]", [1, 2], [1, 2, 3]);
compare("{a:1} {a:'1'}", { a: 1 }, { a: "1" });
compare("{a:1} {a:null}", { a: 1 }, { a: null });
compare("{a:undefined} {}", { a: undefined }, {});
compare("{a:1,b:2} {b:2,a:1}", { a: 1, b: 2 }, { b: 2, a: 1 });
compare("nested", { list: [1, { x: "2" }] }, { list: ["1", { x: 2 }] });
compare("nested unequal", { list: [1, { x: "2" }] }, { list: [1, { x: 3 }] });
compare("null prototype", Object.create(null), {});
compare("Map loose key", new Map([[1, "a"]]), new Map([["1", "a"]]));
compare("Map loose value", new Map([["k", 1]]), new Map([["k", "1"]]));
compare("Map unequal", new Map([["k", 1]]), new Map([["k", 2]]));
compare("Set loose", new Set([1, "2"]), new Set(["1", 2]));
compare("Set unequal", new Set([1]), new Set([2]));
compare("Set objects", new Set([{ a: 1 }]), new Set([{ a: "1" }]));
compare("Float64Array 0 -0", new Float64Array([0]), new Float64Array([-0]));
compare("Float64Array NaN", new Float64Array([NaN]), new Float64Array([NaN]));
compare("Buffer Uint8Array", Buffer.from([1, 2]), new Uint8Array([1, 2]));
compare("Date", new Date(0), new Date(0));
compare("Date unequal", new Date(0), new Date(1));

try {
  assert.deepEqual({ a: 1 }, { a: 2 }, "custom message");
} catch (e) {
  const error = /** @type {any} */ (e);
  console.log(error.message, error.generatedMessage, error.operator, JSON.stringify(error.actual), JSON.stringify(error.expected));
}
try {
  assert.notDeepEqual([1], ["1"], "custom not");
} catch (e) {
  const error = /** @type {any} */ (e);
  console.log(error.message, error.generatedMessage, error.operator);
}
try {
  assert.deepEqual(1, 2, "");
} catch (e) {
  const error = /** @type {any} */ (e);
  console.log(JSON.stringify(error.message), error.generatedMessage);
}
