/** Test lanes run against one immutable checkout and one immutable toolchain
 * for the lifetime of each Vitest worker. Production deliberately rediscovers
 * compiler/linker inputs on every invocation, but doing that thousands of
 * times in the differential corpus costs far more than the compile itself.
 * This test-only opt-in lets those workers reuse metadata probes for their
 * session; the cache-correctness suite removes the flag and exercises the
 * strict production path. */
export function stableTestToolchainSession(): boolean {
  return process.env["SCRIPTC_TEST_STABLE_TOOLCHAIN"] === "1";
}

export function stableTestMemo<T>(
  cache: Map<string, Promise<T>>,
  key: string,
  probe: () => Promise<T>,
): Promise<T> {
  if (!stableTestToolchainSession()) return probe();
  const existing = cache.get(key);
  if (existing !== undefined) return existing;
  const pending = probe();
  cache.set(key, pending);
  void pending.catch(() => {
    if (cache.get(key) === pending) cache.delete(key);
  });
  return pending;
}

export class CacheInputsChangedError extends Error {
  constructor() {
    super("runtime inputs changed while populating the native object cache");
    this.name = "CacheInputsChangedError";
  }
}
