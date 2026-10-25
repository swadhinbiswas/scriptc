// The skip and todo twins of describe, suite and it: a skipped suite does
// not run its body, and a todo suite's tests are todo.
import { describe, it, suite } from "node:test";

describe("variants", () => {
  it("runs", () => {});
  it.skip("it.skip", () => {
    throw new Error("a skipped test does not run");
  });
  it.todo("it.todo", () => {});
  describe.skip("describe.skip", () => {
    it("inside a skipped suite", () => {});
  });
  suite.skip("suite.skip", () => {
    it("inside a skipped suite", () => {});
  });
  suite.todo("suite.todo", () => {
    it("inherits todo", () => {});
  });
});
