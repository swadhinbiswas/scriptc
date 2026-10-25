// mock.fn and t.mock.fn: the calls log (arguments, result, error, this),
// callCount, mockImplementation, mockImplementationOnce (the next call by
// default, or a given call index, a later registration for the same index
// replacing the earlier one), resetCalls and restore. Each read of
// fn.mock.calls is a copy. A throwing implementation records the error and
// rethrows it.
import assert from "node:assert";
import { mock, test } from "node:test";

test("records calls", () => {
  const add = mock.fn((a: number, b: number) => a + b);
  assert.strictEqual(add(1, 2), 3);
  assert.strictEqual(add(3, 4), 7);
  assert.strictEqual(add.mock.callCount(), 2);
  const [first, second] = add.mock.calls;
  assert.deepStrictEqual(first!.arguments, [1, 2] as [number, number]);
  assert.ok(first!.result === 3);
  assert.ok(first!.error === undefined);
  assert.ok(first!.this === undefined);
  assert.deepStrictEqual(second!.arguments, [3, 4] as [number, number]);
  assert.ok(add.mock.calls !== add.mock.calls);
});

test("changes implementations", () => {
  const add = mock.fn((a: number, b: number) => a + b);
  add.mock.mockImplementationOnce((a, b) => a - b);
  add.mock.mockImplementation((a, b) => a * b);
  assert.strictEqual(add(5, 3), 2);
  assert.strictEqual(add(5, 3), 15);
  add.mock.mockImplementationOnce(() => 100, 4);
  add.mock.mockImplementationOnce(() => 200, 4);
  assert.strictEqual(add(1, 1), 1);
  assert.strictEqual(add(1, 1), 1);
  assert.strictEqual(add(1, 1), 200);
  assert.strictEqual(add(1, 1), 1);
  assert.strictEqual(add.mock.callCount(), 6);
  add.mock.resetCalls();
  assert.strictEqual(add.mock.callCount(), 0);
  assert.strictEqual(add.mock.calls.length, 0);
  add.mock.mockImplementationOnce(() => -1);
  assert.strictEqual(add(2, 2), -1);
  add.mock.restore();
  assert.strictEqual(add(2, 2), 4);
});

test("an implementation separate from the original", () => {
  type Greet = (name: string) => string;
  const hi: Greet = (name) => `hi ${name}`;
  const yo: Greet = (name) => `yo ${name}`;
  const greet = mock.fn(hi, yo);
  assert.strictEqual(greet("a"), "yo a");
  greet.mock.restore();
  assert.strictEqual(greet("a"), "hi a");
});

test("records errors", () => {
  const thrown = new Error("too big");
  const check = mock.fn((x: number): number => {
    if (x > 1) throw thrown;
    return x;
  });
  assert.throws(() => check(2), thrown);
  assert.strictEqual(check(1), 1);
  const [failed, passed] = check.mock.calls;
  assert.ok(failed!.result === undefined);
  assert.ok(failed!.error === thrown);
  assert.ok(passed!.result === 1);
  assert.ok(passed!.error === undefined);
});

test("rest parameters and void functions", () => {
  const count = mock.fn((...values: number[]) => values.length);
  assert.strictEqual(count(1, 2, 3), 3);
  assert.strictEqual(count(), 0);
  assert.deepStrictEqual(count.mock.calls[0]!.arguments, [1, 2, 3]);
  assert.deepStrictEqual(count.mock.calls[1]!.arguments, []);
  const log: number[] = [];
  const push = mock.fn((x: number): void => {
    log.push(x);
  });
  push(5);
  assert.deepStrictEqual(log, [5]);
  assert.ok(push.mock.calls[0]!.result === undefined);
});

test("t.mock.fn", (t) => {
  const length = t.mock.fn((s: string) => s.length);
  assert.strictEqual(length("abc"), 3);
  assert.strictEqual(length.mock.callCount(), 1);
  assert.deepStrictEqual(length.mock.calls[0]!.arguments, ["abc"] as [string]);
});
