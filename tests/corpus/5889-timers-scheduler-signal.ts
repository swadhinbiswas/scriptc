// timers/promises scheduler.wait(delay, { signal }) passes its options to
// setTimeout, so an AbortSignal rejects the wait with an AbortError: when
// it aborts during the wait, and at once when it has already aborted. A
// signal that never aborts leaves the wait to resolve undefined.
import { scheduler } from "node:timers/promises";

async function main(): Promise<void> {
  const ac = new AbortController();
  const pending = scheduler.wait(10_000, { signal: ac.signal }).then(
    () => "resolved",
    (e: Error & { code?: string }) => `rejected ${e.name} ${e.code}`,
  );
  setTimeout(() => ac.abort(), 5);
  console.log(await pending);

  const quiet = new AbortController();
  const settled = await scheduler.wait(2, { signal: quiet.signal, ref: true });
  console.log("settled with", settled);

  const pre = new AbortController();
  pre.abort();
  try {
    await scheduler.wait(1, { signal: pre.signal });
    console.log("not rejected");
  } catch (e) {
    console.log("already aborted:", (e as Error).name);
  }
}

main();
