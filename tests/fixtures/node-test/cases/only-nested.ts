// The only twins of describe, suite and it inside a suite: the marked
// tests and suites run, and their unmarked siblings, and the unmarked
// top-level suites, do not.
import { describe, it, suite } from "node:test";

describe("not marked", () => {
  it("dropped with its suite", () => {
    throw new Error("an unmarked top-level suite does not run");
  });
});

describe("only among siblings", () => {
  it.only("it.only runs", () => {});
  it("dropped", () => {
    throw new Error("an unmarked sibling of it.only does not run");
  });
  describe.only("describe.only", () => {
    it("inside", () => {});
  });
  suite.only("suite.only", () => {
    it("inside", () => {});
  });
  describe("unmarked suite", () => {
    it("dropped", () => {
      throw new Error("an unmarked suite next to describe.only does not run");
    });
  });
});
