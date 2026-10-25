import { expect, test } from "vitest";
import { parallelMap } from "../scripts/parallel-map.mjs";

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

test("build tasks overlap within their budget and retain manifest order", async () => {
  const first = deferred();
  const secondStarted = deferred();
  let active = 0,
    peak = 0;
  const completed: number[] = [];
  const work = parallelMap([0, 1, 2, 3], 2, async (item: number) => {
    active++;
    peak = Math.max(peak, active);
    if (item === 0) await first.promise;
    else secondStarted.resolve();
    active--;
    completed.push(item);
    return `artifact-${item}`;
  });
  await secondStarted.promise;
  expect(completed).toContain(1);
  expect(completed).not.toContain(0);
  first.resolve();
  expect(await work).toEqual(["artifact-0", "artifact-1", "artifact-2", "artifact-3"]);
  expect(peak).toBe(2);
});

test("failed builds finish in-flight compilers before staging cleanup can run", async () => {
  const running = deferred();
  const failure = new Error("compiler failed");
  const seen: number[] = [];
  let finished = false;
  const work = parallelMap([0, 1, 2, 3], 2, async (item: number) => {
    seen.push(item);
    if (item === 0) throw failure;
    await running.promise;
  });
  const checked = expect(work).rejects.toBe(failure);
  void work.then(
    () => {
      finished = true;
    },
    () => {
      finished = true;
    },
  );
  await Promise.resolve();
  expect(finished).toBe(false);
  expect(seen).toEqual([0, 1]);
  running.resolve();
  await checked;
  expect(seen).toEqual([0, 1]);
  expect(finished).toBe(true);
});

test("empty build queues finish and malformed concurrency fails", async () => {
  expect(
    await parallelMap([], 2, () => {
      throw new Error("unexpected task");
    }),
  ).toEqual([]);
  for (const width of [0, -1, 1.5, NaN, Infinity])
    await expect(parallelMap([0], width, () => 0)).rejects.toThrow("invalid build concurrency");
});
