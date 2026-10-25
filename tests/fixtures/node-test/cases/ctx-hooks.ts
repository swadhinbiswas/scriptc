// @exit: 1
// TestContext hooks: t.before runs when it is called; t.beforeEach and
// t.afterEach wrap every descendant subtest, inside the enclosing suite's
// afterEach; t.after runs after the test's own afterEach chain, also when
// the body throws. A throwing t.before fails the test and the subtests that
// follow (their afterEach hooks still run); a throwing t.after fails the
// test. The last test checks the order the hooks ran in.
import assert from "node:assert";
import { afterEach, beforeEach, describe, it } from "node:test";

const log: string[] = [];

describe("outer", () => {
  afterEach(() => {
    log.push("outer afterEach");
  });
  it("with hooks", async (t) => {
    t.after(() => {
      log.push("t.after");
    });
    t.before(() => {
      log.push("t.before");
    });
    t.beforeEach(() => {
      log.push("t.beforeEach");
    });
    t.afterEach(() => {
      log.push("t.afterEach");
    });
    log.push("body");
    await t.test("a", () => {
      log.push("a");
    });
    await t.test("b", async (st) => {
      log.push("b");
      await st.test("b1", () => {
        log.push("b1");
      });
    });
    log.push("body end");
  });
  it("no subtests", (t) => {
    t.before(() => {
      log.push("before without subtests");
    });
    t.after(() => {
      log.push("after without subtests");
    });
  });
  it("after on failure", (t) => {
    t.after(() => {
      log.push("after on failure");
    });
    throw new Error("fails");
  });
  it("before throws", async (t) => {
    t.beforeEach(() => {
      log.push("never: beforeEach");
    });
    t.before(() => {
      throw new Error("before boom");
    });
    await t.test("sub after a throwing before", () => {
      log.push("never: sub body");
    });
    log.push("after the failed sub");
  });
  it("after throws", (t) => {
    t.after(() => {
      throw new Error("after boom");
    });
  });
});

describe("order", () => {
  beforeEach(() => {});
  it("matches Node", () => {
    assert.deepStrictEqual(log, [
      "t.before",
      "body",
      "t.beforeEach",
      "a",
      "t.afterEach",
      "outer afterEach",
      "t.beforeEach",
      "b",
      "t.beforeEach",
      "b1",
      "t.afterEach",
      "outer afterEach",
      "t.afterEach",
      "outer afterEach",
      "body end",
      "outer afterEach",
      "t.after",
      "before without subtests",
      "outer afterEach",
      "after without subtests",
      "outer afterEach",
      "after on failure",
      "outer afterEach",
      "after the failed sub",
      "outer afterEach",
      "outer afterEach",
    ]);
  });
});
