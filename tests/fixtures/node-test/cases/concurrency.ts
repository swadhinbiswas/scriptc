// @exit: 1
// The concurrency option on suites and tests. Subtests of a parent with a
// concurrency above 1 run at the same time, up to that many at once, and
// start in declaration order as slots free up; nested suites and tests
// inherit the parent's value. Results are reported in declaration order.
// t.test and test() calls inside a concurrent test start the subtest at
// once. A concurrency that is not a positive integer up to 4294967295
// throws Node's ERR_OUT_OF_RANGE when the test or suite is created.
import { after, beforeEach, describe, it, test } from "node:test";

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms * 3));
const log: string[] = [];
const expected: string[] = [];

describe("unlimited", { concurrency: true }, () => {
  it("slow", async () => {
    log.push("slow start");
    await delay(60);
    log.push("slow end");
  });
  it("fast", async () => {
    log.push("fast start");
    await delay(10);
    log.push("fast end");
  });
  it("sync", () => {
    log.push("sync");
  });
  after(() => {
    expected.push("slow start", "fast start", "sync", "fast end", "slow end");
  });
});

describe("limited", { concurrency: 2 }, () => {
  it("a", async () => {
    log.push("a start");
    await delay(40);
    log.push("a end");
  });
  it("b", async () => {
    log.push("b start");
    await delay(10);
    log.push("b end");
  });
  it("c", async () => {
    log.push("c start");
    await delay(10);
    log.push("c end");
  });
  after(() => {
    expected.push("a start", "b start", "b end", "c start", "c end", "a end");
  });
});

describe("in order", { concurrency: false }, () => {
  it("x", async () => {
    log.push("x start");
    await delay(20);
    log.push("x end");
  });
  it("y", () => {
    log.push("y");
  });
  after(() => {
    expected.push("x start", "x end", "y");
  });
});

describe("turns", { concurrency: true }, () => {
  it("ticker", async () => {
    for (let i = 0; i < 12; i++) {
      log.push(`t${i}`);
      await null;
    }
  });
  describe("hooked", () => {
    beforeEach(() => {
      log.push("hook");
    });
    it("h", () => {
      log.push("h");
    });
  });
  describe("plain", () => {
    it("p", () => {
      log.push("p");
    });
  });
  it("s", () => {
    log.push("s");
  });
  after(() => {
    expected.push("t0", "s", "t1", "t2", "hook", "p", "t3", "t4", "t5", "t6", "t7", "t8");
    expected.push("t9", "t10", "h", "t11");
  });
});

// `true` runs every subtest at once, whatever the CPU count.
let running = 0;
let most = 0;
describe("all at once", { concurrency: true }, () => {
  for (let i = 0; i < 64; i++) {
    it(`n${i}`, async () => {
      running++;
      most = Math.max(most, running);
      await delay(5);
      running--;
    });
  }
  after(() => {
    log.push(`most ${most}`);
    expected.push("most 64");
  });
});

test("subtests", { concurrency: 2 }, async (t) => {
  void t.test("u1", async () => {
    log.push("u1 start");
    await delay(30);
    log.push("u1 end");
  });
  void t.test("u2", async () => {
    log.push("u2 start");
    await delay(5);
    log.push("u2 end");
  });
  void t.test("u3", async () => {
    log.push("u3 start");
    await delay(5);
    log.push("u3 end");
  });
  log.push("body end");
  expected.push("u1 start", "u2 start", "body end", "u2 end", "u3 start", "u3 end", "u1 end");
});

test("awaited together", { concurrency: true }, async (t) => {
  await Promise.all([
    t.test("w1", async () => {
      log.push("w1 start");
      await delay(20);
      log.push("w1 end");
    }),
    t.test("w2", async () => {
      log.push("w2 start");
      await delay(5);
      log.push("w2 end");
    }),
  ]);
  log.push("joined");
  expected.push("w1 start", "w2 start", "w2 end", "w1 end", "joined");
});

test("nested test() calls", { concurrency: true }, async () => {
  test("v1", async () => {
    log.push("v1 start");
    await delay(20);
    log.push("v1 end");
  });
  test("v2", async () => {
    log.push("v2 start");
    await delay(5);
    log.push("v2 end");
  });
  log.push("nested body end");
  expected.push("v1 start", "v2 start", "nested body end", "v2 end", "v1 end");
});

test("failures report in order", { concurrency: true }, async (t) => {
  void t.test("f1", async () => {
    await delay(20);
    throw new Error("f1");
  });
  void t.test("f2", async () => {
    await delay(5);
    throw new Error("f2");
  });
});

const rangeErrors: string[] = [];
for (const concurrency of [0, 1.5, 2 ** 32]) {
  try {
    describe("invalid", { concurrency }, () => {});
  } catch (error) {
    rangeErrors.push(`${(error as Error).name} ${(error as Error).message}`);
  }
}

test("ran concurrently", () => {
  if (log.join(",") !== expected.join(",")) throw new Error(`${log.join(",")}`);
  const range = 'The value of "options.concurrency" is out of range.';
  const want = [
    `RangeError ${range} It must be >= 1 && <= 4294967295. Received 0`,
    `RangeError ${range} It must be an integer. Received 1.5`,
    `RangeError ${range} It must be >= 1 && <= 4294967295. Received 4294967296`,
  ];
  if (rangeErrors.join("\n") !== want.join("\n")) throw new Error(rangeErrors.join("\n"));
});
