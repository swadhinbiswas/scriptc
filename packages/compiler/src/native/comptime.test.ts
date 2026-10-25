import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, expect, test } from "vitest";
import { nativeCodegenTarget } from "../backend/targets.js";
import { ts7Executable } from "../frontend/ts7/rpc-api.js";
import { evaluateNativeComptime } from "./comptime.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const target = nativeCodegenTarget({});
const stage = mkdtempSync(
  join(process.platform === "win32" ? tmpdir() : "/tmp", "scriptc-comptime-test-"),
);
const evaluator = join(stage, "comptime" + (process.platform === "win32" ? ".exe" : ""));

beforeAll(() => {
  if (target === null) throw new Error("a supported native host is required");
  const runtime = join(root, target.runtimePackPackage.replace("@scriptc/", ""));
  execFileSync(target.defaultLinker, [
    ...target.defaultLinkerArgs,
    "-std=c11",
    "-O2",
    "-Wall",
    "-Wextra",
    "-Werror",
    "-I",
    join(root, "runtime/vendor/quickjs-ng"),
    join(root, "compiler/native/comptime.c"),
    join(runtime, "artifacts/vendor/quickjs/libscriptc-quickjs.a"),
    "-lm",
    "-lpthread",
    "-o",
    evaluator,
  ]);
});
afterAll(() => {
  rmSync(stage, { recursive: true, force: true });
});

function evaluate(source: string, timeout = 2000): unknown {
  return evaluateNativeComptime(source, timeout, ts7Executable(), evaluator);
}

test("native comptime erases TypeScript and returns the actual structured value", () => {
  expect(
    evaluate(`() => {
    interface Pair { value: number; text: string }
    const make = <T>(value: T): T => value;
    const items: Pair[] = [];
    for (let i = 0; i < 4; i++) items.push(make({ value: i * i, text: String(i) }));
    return { items, zero: -0, text: "hello \\ud83c\\udf0d", lone: "\\ud800", empty: undefined };
  }`),
  ).toEqual({
    items: [0, 1, 4, 9].map((value, index) => ({ value, text: String(index) })),
    zero: -0,
    text: "hello 🌍",
    lone: "\ud800",
    empty: undefined,
  });
});

test("native comptime retains non-finite values for shared result validation", () => {
  const values = evaluate(
    "() => [NaN, Infinity, -Infinity, -0, undefined, null, 123n]",
  ) as unknown[];
  expect(values).toEqual([NaN, Infinity, -Infinity, -0, undefined, null, 123n]);
});

test("callback changes to globals and serialization hooks cannot replace its result", () => {
  expect(
    evaluate(`() => {
    JSON.stringify = () => '"spoofed"';
    Array.prototype.toJSON = () => "spoofed";
    Object.prototype.toJSON = () => "spoofed";
    return { values: [1, 2], nested: { ok: true } };
  }`),
  ).toEqual({ values: [1, 2], nested: { ok: true } });
});

test("native comptime isolates callbacks and exposes no host bindings", () => {
  expect(evaluate("() => { globalThis.saved = 1; return 2; }")).toBe(2);
  expect(
    evaluate("() => [typeof saved, typeof process, typeof require, typeof console, typeof fetch]"),
  ).toEqual(["undefined", "undefined", "undefined", "undefined", "undefined"]);
});

test("throws, cycles, and runaway callbacks report bounded failures", () => {
  expect(() => evaluate('() => { throw new Error("user failure") }')).toThrow("user failure");
  expect(() =>
    evaluate("() => { const result = {}; result.self = result; return result; }"),
  ).toThrow("cyclic compile-time result");
  let failure: unknown;
  try {
    evaluate("() => { while (true) {} }", 20);
  } catch (error) {
    failure = error;
  }
  expect(failure).toMatchObject({ code: "ERR_SCRIPT_EXECUTION_TIMEOUT" });
  expect(evaluate("() => 42")).toBe(42);
});
