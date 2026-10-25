// AssertionError options validation, generatedMessage from the message's
// truthiness, the class reached through the default export, and the
// `diff` option's effect on long messages.
import assert, { AssertionError } from "node:assert";

/** @param {string} label @param {() => unknown} fn */
function show(label, fn) {
  try {
    console.log(label, fn());
  } catch (e) {
    const error = /** @type {any} */ (e);
    console.log(label, "threw", error.name, error.code, JSON.stringify(error.message));
  }
}

/** @param {unknown} options */
const make = (options) => new AssertionError(/** @type {any} */ (options));
show("undefined options", () => make(undefined));
show("string options", () => make("x"));
show("number options", () => make(5));
show("null options", () => make(null));
show("array options", () => make([]));
show("function options", () => make(() => 1));
show("object options", () => make({ actual: 1, expected: 1, operator: "notStrictEqual" }).message);

const error = new AssertionError({ actual: 1, expected: 2, operator: "strictEqual" });
show("default export instanceof", () => error instanceof assert.AssertionError);
show("numeric message", () => {
  const numeric = make({ message: 0, actual: 1, expected: 2 });
  return [JSON.stringify(numeric.message), numeric.generatedMessage];
});
show("object message", () => {
  const object = make({ message: { toString: () => "from toString" } });
  return [JSON.stringify(object.message), object.generatedMessage];
});
show("caught", () => {
  try {
    assert.ok(false);
  } catch (e) {
    return [e instanceof AssertionError, /** @type {any} */ (e).code];
  }
});
show("thrown and matched", () => {
  assert.throws(() => { throw make({ message: "custom" }); }, AssertionError);
  assert.throws(() => { throw make({ message: "custom" }); }, /custom/);
  return "ok";
});

const long = Array.from({ length: 60 }, (_, i) => i);
const longer = Array.from({ length: 200 }, (_, i) => i);
const wide = "x".repeat(600);
/** @param {unknown} diff @param {unknown} actual @param {unknown} expected @param {string} operator */
const text = (diff, actual, expected, operator) =>
  JSON.stringify(make({ actual, expected, operator, diff }).message);
for (const diff of [undefined, "simple", "full", "other"]) {
  show(`diff ${diff} notIdentical`, () => text(diff, long, long.slice(), "deepStrictEqual"));
  show(`diff ${diff} notDeepStrictEqual`, () => text(diff, long, long.slice(), "notDeepStrictEqual"));
  show(`diff ${diff} notDeepEqual`, () => text(diff, longer, longer.slice(), "notDeepEqual"));
  show(`diff ${diff} deepEqual`, () => text(diff, wide, "y", "deepEqual"));
  show(`diff ${diff} generic`, () => text(diff, "y", wide, "=="));
  show(`diff ${diff} property`, () => make({ actual: 1, expected: 2, operator: "strictEqual", diff }).diff);
}
