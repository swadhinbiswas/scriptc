// describe.todo and a todo option on a suite: the tests and suites under
// it are todo, with a bare TODO directive, unless they are skipped or carry
// their own todo message. Subtests of an inherited-todo test are todo too.
// A failing inherited-todo test prints ⚠, is listed under failing tests,
// and leaves the exit code 0.
import { describe, it, test } from "node:test";

describe.todo("todo suite", () => {
  it("passes", () => {});
  it("fails", () => {
    throw new Error("boom");
  });
  it.skip("skipped", () => {});
  it("own todo", { todo: "later" }, () => {});
  describe("nested", () => {
    it("deep", () => {});
  });
  test("with sub", async (t) => {
    await t.test("sub", () => {});
  });
});

describe("todo message", { todo: "not yet" }, () => {
  it("inherits", () => {});
});

describe("plain", () => {
  it("runs", () => {});
});
