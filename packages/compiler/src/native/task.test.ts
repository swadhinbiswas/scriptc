import { expect, test } from "vitest";
import { runCompilerTask } from "./task.js";

test("compiler work starts after the caller can suspend and preserves its result", async () => {
  const events: string[] = [];
  const result = { ok: true, diagnostics: [] };
  const pending = runCompilerTask(() => {
    events.push("compile");
    return result;
  });
  events.push("caller");
  expect(events).toEqual(["caller"]);
  expect(await pending).toBe(result);
  expect(events).toEqual(["caller", "compile"]);
});

test("synchronous compiler failures reject the task without escaping its microtask", async () => {
  const failure = new Error("compiler failed");
  await expect(
    runCompilerTask(() => {
      throw failure;
    }),
  ).rejects.toBe(failure);
  expect(await runCompilerTask(() => 42)).toBe(42);
});
