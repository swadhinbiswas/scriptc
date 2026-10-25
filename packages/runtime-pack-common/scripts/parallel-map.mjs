/** Bounded build work that preserves manifest order and drains in-flight
 * compilers before propagating a failure to the staging-directory cleanup. */
export async function parallelMap(items, width, task) {
  if (!Number.isInteger(width) || width < 1) throw new Error("invalid build concurrency");
  const results = new Array(items.length);
  let next = 0;
  let failed = false;
  const workers = Array.from({ length: Math.min(width, items.length) }, async () => {
    while (!failed && next < items.length) {
      const index = next++;
      try {
        results[index] = await task(items[index]);
      } catch (error) {
        failed = true;
        throw error;
      }
    }
  });
  const settled = await Promise.allSettled(workers);
  const failure = settled.find((result) => result.status === "rejected");
  if (failure) throw failure.reason;
  return results;
}
