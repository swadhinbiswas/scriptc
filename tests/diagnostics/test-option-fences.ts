// node:test options lower for skip, todo, only and concurrency on tests and
// suites, and plan and timeout on tests. Each other form is refused with a
// named diagnostic: a concurrency that is neither a boolean literal nor a
// number, a suite's timeout and plan, and a plan that is not a
// non-negative integer literal.
import { describe, test } from "node:test";

test("lowers", { plan: 1, timeout: 50, concurrency: 2 }, (t) => {
  t.assert.ok(true);
});

const parallel = process.argv.length > 2;
test("computed concurrency", { concurrency: parallel }, () => {});

describe("suite timeout", { timeout: 100 }, () => {});

describe("suite plan", { plan: 1 }, () => {});

const count = 2;
test("computed plan", { plan: count }, () => {});
