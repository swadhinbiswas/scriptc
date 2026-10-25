// node:assert's Assert class with literal options: the strict default and its
// aliases, a loose instance, and diff: "full". Node passes the instance's diff
// to the AssertionError of fail, ifError and the equality methods; ok, match,
// doesNotMatch and the throws and rejects expectations keep "simple".
import { Assert, AssertionError } from "node:assert";

const strictInstance = new Assert();
const loose = new Assert({ strict: false });
const full = new Assert({ diff: "full" });
const fullLoose = new Assert({ diff: "full", strict: false });
const simple = new Assert({ diff: "simple", strict: true, skipPrototype: false });

async function show(label, fn) {
  try {
    await fn();
    console.log(label, "passed");
  } catch (e) {
    // @types/node declares no diff property: read the error untyped.
    const error = /** @type {any} */ (e);
    if (!(error instanceof AssertionError)) throw e;
    const lines = error.message.split("\n");
    console.log(label, error.operator, error.diff, error.generatedMessage, lines.length);
    console.log("  ", JSON.stringify(lines[0]), JSON.stringify(lines[lines.length - 2] ?? ""));
  }
}

await show("strict equal", () => strictInstance.equal(1, 2));
await show("strict notEqual", () => strictInstance.notEqual(1, 1));
await show("strict deepEqual", () => strictInstance.deepEqual({ a: 1 }, { a: 2 }));
await show("strict notDeepEqual", () => strictInstance.notDeepEqual({ a: 1 }, { a: 1 }));
await show("loose equal passes", () => loose.equal(1, "1"));
await show("loose equal", () => loose.equal(1, 2));
await show("loose deepEqual passes", () => loose.deepEqual({ a: 1 }, { a: "1" }));
await show("loose notDeepEqual", () => loose.notDeepEqual({ a: 1 }, { a: "1" }));
await show("simple strictEqual", () => simple.strictEqual(1, 2));

const long = [];
const other = [];
for (let i = 0; i < 80; i++) {
  long.push(i);
  other.push(i);
}
other[70] = -1;
const text = "x".repeat(600);

await show("full strictEqual", () => full.strictEqual(1, 2));
await show("full deepStrictEqual", () => full.deepStrictEqual(long, other));
await show("simple deepStrictEqual", () => simple.deepStrictEqual(long, other));
await show("full notDeepStrictEqual", () => full.notDeepStrictEqual(long, long));
await show("simple notDeepStrictEqual", () => simple.notDeepStrictEqual(long, long));
await show("full notStrictEqual", () => full.notStrictEqual(text, text));
await show("full partialDeepStrictEqual", () =>
  full.partialDeepStrictEqual({ a: long }, { a: other }),
);
await show("full loose equal", () => fullLoose.equal(text, "y"));
await show("full loose deepEqual", () => fullLoose.deepEqual({ t: text }, { t: "y" }));
await show("full loose notDeepEqual", () => fullLoose.notDeepEqual({ t: text }, { t: text }));
await show("full fail", () => full.fail("failed"));
await show("full ifError", () => full.ifError(new Error("boom")));
await show("full ok", () => full.ok(long.length > 100));
await show("full match", () => full.match(text, /y/));
await show("full doesNotMatch", () => full.doesNotMatch(text, /x/));
await show("full throws none", () => full.throws(() => {}));
await show("full throws class", () =>
  full.throws(() => {
    throw new TypeError("t");
  }, RangeError),
);
await show("full throws shape", () =>
  full.throws(() => {
    throw new TypeError("t");
  }, { message: "other" }),
);
await show("full doesNotThrow", () =>
  full.doesNotThrow(() => {
    throw new TypeError("t");
  }),
);
await show("full rejects", () => full.rejects(Promise.resolve(1)));
await show("full doesNotReject", () => full.doesNotReject(Promise.reject(new TypeError("t"))));
// A failure from a default instance after the full ones.
await show("after full, strict", () => strictInstance.deepStrictEqual(long, other));
