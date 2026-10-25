// The operator, actual and generatedMessage of failing throws and rejects
// expectations: a class, a regular expression and an object shape, with no
// message, an empty message and a custom one. rejects failures report the
// operator "rejects".
import assert, { AssertionError } from "node:assert";

function show(label: string, e: unknown): void {
  if (!(e instanceof AssertionError)) throw e;
  const actual: unknown = e.actual;
  console.log(label, e.operator, e.generatedMessage, actual instanceof Error);
  console.log("  ", JSON.stringify(e.message.split("\n")[0]));
}

function fails(): never {
  throw new TypeError("thrown");
}

function attempt(label: string, fn: () => void): void {
  try {
    fn();
    console.log(label, "passed");
  } catch (e) {
    show(label, e);
  }
}

attempt("throws class", () => assert.throws(fails, RangeError));
attempt("throws regex", () => assert.throws(fails, /nothing/));
attempt("throws shape", () => assert.throws(fails, { message: "other" }));
attempt("throws shape regex", () => assert.throws(fails, { name: "TypeError", message: /^thr/ }));
attempt("throws shape regex mismatch", () =>
  assert.throws(fails, { name: "RangeError", message: /^x/ }),
);

function withMessage(message: string): void {
  attempt(`throws class '${message}'`, () => assert.throws(fails, RangeError, message));
  attempt(`throws regex '${message}'`, () => assert.throws(fails, /nothing/, message));
  attempt(`throws shape '${message}'`, () =>
    assert.throws(fails, { message: "other" }, message),
  );
  attempt(`throws shape regex mismatch '${message}'`, () =>
    assert.throws(fails, { name: "RangeError", message: /^x/ }, message),
  );
}
withMessage("");
withMessage("custom");

async function attemptAsync(label: string, promise: Promise<void>): Promise<void> {
  try {
    await promise;
    console.log(label, "passed");
  } catch (e) {
    show(label, e);
  }
}

const rejected = (): Promise<never> => Promise.reject(new TypeError("rejected"));

async function rejectsCases(message: string): Promise<void> {
  await attemptAsync(`rejects class '${message}'`, assert.rejects(rejected, RangeError, message));
  await attemptAsync(`rejects regex '${message}'`, assert.rejects(rejected, /nothing/, message));
  await attemptAsync(
    `rejects shape '${message}'`,
    assert.rejects(rejected, { message: "other" }, message),
  );
}

await attemptAsync("rejects class", assert.rejects(rejected, RangeError));
await attemptAsync("rejects regex", assert.rejects(rejected, /nothing/));
await attemptAsync("rejects shape", assert.rejects(rejected, { message: "other" }));
await rejectsCases("");
await rejectsCases("custom");
