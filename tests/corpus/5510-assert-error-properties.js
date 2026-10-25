// Every assertion failure is an AssertionError with Node's
// generatedMessage, code, actual, expected, operator and diff
// properties, in Node's key order.
import assert from "node:assert";

/** @param {string} label @param {() => void} fn @param {boolean} [plain] */
function check(label, fn, plain = false) {
  try {
    fn();
    console.log(label, "no throw");
  } catch (e) {
    const error = /** @type {any} */ (e);
    console.log(label, error instanceof assert.AssertionError, error instanceof Error, error.name, error.code);
    console.log("  keys", Object.keys(error).join(","));
    console.log("  generatedMessage", error.generatedMessage, "operator", error.operator, "diff", error.diff);
    // RegExp and Error values print with String(): their console form
    // carries a stack trace.
    if (plain) console.log("  actual", String(error.actual), "expected", String(error.expected));
    else console.log("  actual", error.actual, "expected", error.expected);
  }
}

check("ok", () => assert.ok(0));
check("ok message", () => assert.ok("", "custom"));
check("callable", () => assert(null));
check("fail", () => assert.fail());
check("fail message", () => assert.fail("boom"));
check("equal", () => assert.equal(1, 2));
check("equal message", () => assert.equal(1, 2, "different"));
check("notEqual", () => assert.notEqual(1, 1));
check("strictEqual numbers", () => assert.strictEqual(1, 2));
check("strictEqual strings", () => assert.strictEqual("a", "b"));
check("strictEqual booleans", () => assert.strictEqual(true, false));
check("strictEqual message", () => assert.strictEqual(1, 2, "mine"));
check("notStrictEqual", () => assert.notStrictEqual(1, 1));
check("deepStrictEqual arrays", () => assert.deepStrictEqual([1], [2]));
check("deepStrictEqual objects", () => assert.deepStrictEqual({ a: 1 }, { a: 2 }));
check("notDeepStrictEqual", () => assert.notDeepStrictEqual([1], [1]));
check("match", () => assert.match("abc", /x/), true);
check("doesNotMatch", () => assert.doesNotMatch("abc", /b/), true);
check("throws", () => assert.throws(() => {}));
check("throws message", () => assert.throws(() => {}, "nope"));
check("throws regex", () => assert.throws(() => { throw new Error("x"); }, /y/), true);
check("doesNotThrow", () => assert.doesNotThrow(() => { throw new Error("x"); }), true);
check("ifError string", () => assert.ifError("bad"));
check("ifError number", () => assert.ifError(3));
check("passing", () => assert.strictEqual(1, 1));

try {
  assert.strictEqual(1, 2);
} catch (e) {
  const error = /** @type {any} */ (e);
  console.log(error.message);
  console.log(String(error));
}
