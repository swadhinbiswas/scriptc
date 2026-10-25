// @exit: 1
// The plan and timeout test options. { plan } counts the test's t.assert
// calls and subtests, as t.plan does. { timeout } bounds an async body: when
// the timeout elapses first, the test is cancelled with Node's "test timed
// out after <timeout>ms" message and the run continues; a sync body runs to
// completion. Option values run in source order, and a timeout outside
// 0..2147483647 throws Node's ERR_OUT_OF_RANGE when the test is created.
import { it, test } from "node:test";

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const order: string[] = [];
const note = (label: string, value: number): number => {
  order.push(label);
  return value;
};
const noteText = (label: string): string => {
  order.push(label);
  return `${label} message`;
};

test("plan", { plan: 2 }, (t) => {
  t.assert.ok(true);
  t.assert.strictEqual(1, 1);
});

test("plan mismatch", { plan: 2 }, (t) => {
  t.assert.ok(true);
});

it("plan with a subtest", { plan: 1 }, async (t) => {
  await t.test("inner", () => {});
});

test("fast async body", { timeout: 1000 }, async () => {
  await delay(1);
});

test("sync body past its timeout", { timeout: 1 }, () => {
  const end = Date.now() + 20;
  while (Date.now() < end) {}
});

test("timed out", { timeout: 20 }, async () => {
  await delay(200);
});

test("never settles", { timeout: 10 * 2 }, async () => {
  await new Promise<void>(() => {});
});

test("rejects after timing out", { timeout: 10 }, async () => {
  await delay(40);
  throw new Error("late");
});

test("subtest timeout", async (t) => {
  await t.test("slow inner", { timeout: 15 }, async () => {
    await delay(200);
  });
});

test("infinite timeout", { timeout: Infinity }, async () => {
  await delay(1);
});

test(
  `named ${note("name", 1)}`,
  { timeout: note("timeout", 500), todo: noteText("todo") },
  async () => {},
);

const rangeErrors: string[] = [];
for (const timeout of [-1, 2 ** 40]) {
  try {
    test("out of range", { timeout }, async () => {});
  } catch (error) {
    rangeErrors.push(`${(error as Error).name} ${(error as Error).message}`);
  }
}

test("out-of-range timeouts throw", () => {
  const range = 'The value of "options.timeout" is out of range. It must be >= 0 && <= 2147483647.';
  const expected = [`RangeError ${range} Received -1`, `RangeError ${range} Received 1_099_511_627_776`];
  if (rangeErrors.join("\n") !== expected.join("\n")) throw new Error(rangeErrors.join("\n"));
});

test("options ran in order", () => {
  if (order.join(",") !== "name,timeout,todo") throw new Error(order.join(","));
});
