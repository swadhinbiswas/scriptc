// @exit: 1
// t.plan counts the test's t.assert calls and subtests; a mismatch fails
// the test with Node's string message, which the failing-tests section
// prints inspected. A failing assertion reports its own error. t.fullName
// joins the names from the outermost suite or test with " > ".
import { describe, it, test } from "node:test";

test("plan met", (t) => {
  t.plan(2);
  t.assert.ok(true);
  t.assert.strictEqual(1, 1);
});
test("plan short", (t) => {
  t.plan(3);
  t.assert.ok(true);
});
test("plan over", (t) => {
  t.plan(1);
  t.assert.ok(true);
  t.assert.ok(true);
});
test("plan counts subtests", async (t) => {
  t.plan(2);
  await t.test("a", () => {});
  t.assert.ok(true);
});
test("plan with a failing assertion", (t) => {
  t.plan(2);
  t.assert.ok(true);
  t.assert.strictEqual(1, 2);
});

describe("outer", () => {
  describe("mid", () => {
    it("leaf", (t) => {
      t.assert.strictEqual(t.fullName, "outer > mid > leaf");
    });
  });
});
test("top", async (t) => {
  t.assert.strictEqual(t.fullName, "top");
  await t.test("child", (c) => {
    c.assert.strictEqual(c.fullName, "top > child");
  });
});
