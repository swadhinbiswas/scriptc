// new AssertionError(options): Node's validation, the message generated
// from operator, actual and expected, the properties read at their
// declared types, instanceof, and assert.throws with the class.
import assert, { AssertionError } from "node:assert";

function describe(label: string, error: AssertionError): void {
  console.log(label, JSON.stringify(error.message));
  console.log("  ", error.name, error.code, error.generatedMessage, error.operator, error.actual, error.expected);
  console.log("  ", error instanceof AssertionError, error instanceof Error);
}

describe("strictEqual", new AssertionError({ actual: 1, expected: 2, operator: "strictEqual" }));
describe("strictEqual strings", new AssertionError({ actual: "a long string here", expected: "a long string there", operator: "strictEqual" }));
describe("deepStrictEqual", new AssertionError({ actual: { a: 1 }, expected: { a: 2 }, operator: "deepStrictEqual" }));
describe("notStrictEqual", new AssertionError({ actual: 5, expected: 5, operator: "notStrictEqual" }));
describe("notDeepStrictEqual", new AssertionError({ actual: [1, 2], expected: [1, 2], operator: "notDeepStrictEqual" }));
describe("deepEqual", new AssertionError({ actual: { a: 1 }, expected: { a: 2 }, operator: "deepEqual" }));
describe("notDeepEqual same", new AssertionError({ actual: { a: 1 }, expected: { a: 1 }, operator: "notDeepEqual" }));
describe("notDeepEqual different", new AssertionError({ actual: 1, expected: "1", operator: "notDeepEqual" }));
describe("other operator", new AssertionError({ actual: 1, expected: 2, operator: "<" }));
// Without an operator the property reads as undefined, which the
// declared string type does not cover: read it untyped.
function describeUntyped(label: string, error: any): void {
  console.log(label, JSON.stringify(error.message), error.operator, error.actual, error.expected);
}
describeUntyped("no operator", new AssertionError({ actual: 1, expected: 2 }));
describeUntyped("empty", new AssertionError({}));
describe("message", new AssertionError({ message: "boom", actual: 1, expected: 2, operator: "==" }));
describe("message strictEqual", new AssertionError({ message: "mine", actual: 1, expected: 2, operator: "strictEqual" }));
describe("message empty", new AssertionError({ message: "", actual: 1, expected: 2, operator: "deepEqual" }));

const error = new AssertionError({ actual: 1, expected: 2, operator: "strictEqual" });
console.log(String(error));
console.log(error.toString() === String(error));
const fromOptions = new AssertionError({ actual: [1], expected: [2], operator: "deepEqual", diff: "full" });
console.log(fromOptions.message.split("\n").length);

assert.throws(() => assert.strictEqual(1, 2), AssertionError);
assert.throws(() => { throw new AssertionError({ message: "thrown" }); }, AssertionError);
assert.throws(() => { throw new AssertionError({ message: "thrown" }); }, { name: "AssertionError", code: "ERR_ASSERTION", message: "thrown" });
try {
  assert.throws(() => { throw new TypeError("not an assertion"); }, AssertionError);
} catch (e) {
  console.log((e as Error).message.split("\n")[0]);
}
try {
  assert.deepStrictEqual({ list: [1, 2, 3] }, { list: [1, 2, 4] }, "lists differ");
} catch (e) {
  if (e instanceof AssertionError) {
    console.log(e.generatedMessage, e.operator, JSON.stringify(e.actual), JSON.stringify(e.expected));
  }
}
