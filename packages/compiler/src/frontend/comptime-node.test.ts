import { expect, test } from "vitest";
import { evaluateNodeComptime } from "./comptime-node.js";

test("the Node evaluator erases callback types and preserves structured values", () => {
  const result = evaluateNodeComptime(
    `(): { total: number; names: string[] } => {
    const values: number[] = [2, 3, 4];
    return { total: values.reduce((sum, value) => sum + value, 0), names: ["雪", "hello"] };
  }`,
    1000,
  );
  expect(result).toEqual({ total: 9, names: ["雪", "hello"] });
});

test("every callback gets fresh globals without Node host bindings", () => {
  expect(
    evaluateNodeComptime("() => { globalThis.marker = 42; return globalThis.marker; }", 1000),
  ).toBe(42);
  expect(evaluateNodeComptime("() => typeof globalThis.marker", 1000)).toBe("undefined");
  expect(
    evaluateNodeComptime(
      "() => [typeof process, typeof require, typeof console, typeof setTimeout]",
      1000,
    ),
  ).toEqual(["undefined", "undefined", "undefined", "undefined"]);
  expect(evaluateNodeComptime('() => JSON.parse("{\\"value\\":42}").value', 1000)).toBe(42);
});

test("throws and timeout codes reach the lowerer's diagnostic boundary", () => {
  expect(() => evaluateNodeComptime('() => { throw new Error("callback failed"); }', 1000)).toThrow(
    "callback failed",
  );
  let error: unknown;
  try {
    evaluateNodeComptime("() => { while (true) {} }", 20);
  } catch (caught) {
    error = caught;
  }
  expect(error).toMatchObject({ code: "ERR_SCRIPT_EXECUTION_TIMEOUT" });
  expect(evaluateNodeComptime("() => 21 * 2", 1000)).toBe(42);
});

test("non-bakeable results retain their identity for shared validation", () => {
  expect(evaluateNodeComptime("() => undefined", 1000)).toBeUndefined();
  expect(evaluateNodeComptime("() => NaN", 1000)).toBeNaN();
  expect(evaluateNodeComptime("() => Infinity", 1000)).toBe(Infinity);
  expect(typeof evaluateNodeComptime("() => () => 1", 1000)).toBe("function");
  const cyclic = evaluateNodeComptime(
    "() => { const value = {}; value.self = value; return value; }",
    1000,
  ) as { self: unknown };
  expect(cyclic.self).toBe(cyclic);
});
