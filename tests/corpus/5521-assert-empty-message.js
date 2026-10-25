// An empty custom message, as a literal and as a value computed at run
// time. Node keeps it and reports generatedMessage true for the methods that
// pass it to the AssertionError constructor, builds the generated message
// for match, doesNotMatch and the throws regex and class expectations, and
// reports generatedMessage false for ok, throws with nothing thrown,
// doesNotThrow, rejects with nothing rejected and doesNotReject. Each line
// prints the first line of the message.
import assert, { AssertionError } from "node:assert";

const empty = process.argv.length > 99 ? "unused" : "";

function report(label, fn) {
  try {
    fn();
    console.log(label, "did not throw");
  } catch (e) {
    if (!(e instanceof AssertionError)) throw e;
    console.log(label, e.generatedMessage, e.operator, JSON.stringify(e.message.split("\n")[0]));
  }
}

/**
 * @param {string} kind
 * @param {string} message
 */
function runAll(kind, message) {
  console.log(`-- ${kind}`);
  report("ok", () => assert.ok(false, message));
  report("assert", () => assert(0, message));
  report("fail", () => assert.fail(message));
  report("equal", () => assert.equal(1, 2, message));
  report("notEqual", () => assert.notEqual(1, 1, message));
  report("strictEqual", () => assert.strictEqual(1, 2, message));
  report("strictEqual strings", () => assert.strictEqual("a", "b", message));
  report("strictEqual booleans", () => assert.strictEqual(true, false, message));
  report("strictEqual bigints", () => assert.strictEqual(1n, 2n, message));
  report("notStrictEqual", () => assert.notStrictEqual(1, 1, message));
  report("notStrictEqual strings", () => assert.notStrictEqual("a", "a", message));
  report("deepStrictEqual", () => assert.deepStrictEqual([1], [2], message));
  report("notDeepStrictEqual", () => assert.notDeepStrictEqual([1], [1], message));
  report("notDeepStrictEqual bytes", () =>
    assert.notDeepStrictEqual(new Uint8Array([1]), new Uint8Array([1]), message),
  );
  report("deepEqual", () => assert.deepEqual({ a: 1 }, { a: 2 }, message));
  report("notDeepEqual", () => assert.notDeepEqual({ a: 1 }, { a: 1 }, message));
  report("partialDeepStrictEqual", () =>
    assert.partialDeepStrictEqual({ a: 1, b: 2 }, { a: 2 }, message),
  );
  report("match", () => assert.match("abc", /x/, message));
  report("doesNotMatch", () => assert.doesNotMatch("abc", /a/, message));
  report("throws none", () => assert.throws(() => {}, message));
  report("throws regex", () =>
    assert.throws(() => {
      throw new Error("e");
    }, /x/, message),
  );
  report("throws class", () =>
    assert.throws(() => {
      throw new TypeError("e");
    }, RangeError, message),
  );
  report("doesNotThrow", () =>
    assert.doesNotThrow(() => {
      throw new Error("e");
    }, message),
  );
}
runAll("literal", "");
runAll("computed", empty);

async function reportAsync(label, promise) {
  try {
    await promise;
    console.log(label, "did not reject");
  } catch (e) {
    if (!(e instanceof AssertionError)) throw e;
    console.log(label, e.generatedMessage, e.operator, JSON.stringify(e.message.split("\n")[0]));
  }
}

await reportAsync("rejects none", assert.rejects(Promise.resolve(1), ""));
await reportAsync("doesNotReject", assert.doesNotReject(Promise.reject(new Error("e")), ""));
