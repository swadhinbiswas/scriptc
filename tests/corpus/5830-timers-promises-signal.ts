// node:timers/promises setTimeout(delay, value, { signal }) and
// setImmediate(value, { signal }): an aborted signal rejects at once with an
// AbortError whose cause is the signal's reason; an abort while waiting
// clears the timer and rejects; an abort after the timer fired changes
// nothing; a value that is not an AbortSignal rejects with
// ERR_INVALID_ARG_TYPE. The ordering case pins when the rejection reaches
// its handlers relative to a chain of microtasks started with the abort.
import { setTimeout as sleep, setImmediate as immediate } from "node:timers/promises";

function describe(e: unknown): string {
  const err = e as Error;
  const code = (e as { code?: string }).code;
  const reason = err.cause;
  const cause = reason instanceof Error ? `${reason.name}: ${reason.message}` : String(reason);
  return `${err.name} ${code} "${err.message}" cause=${cause}`;
}

async function main(): Promise<void> {
  try {
    await sleep(1000, "never", { signal: AbortSignal.abort() });
  } catch (e) {
    console.log("pre-aborted:", describe(e));
  }

  try {
    await sleep(1000, "never", { signal: AbortSignal.abort("stopped") });
  } catch (e) {
    console.log("pre-aborted reason:", describe(e));
  }

  const ac = new AbortController();
  const started = Date.now();
  const pending = sleep(5000, "late", { signal: ac.signal });
  setTimeout(() => ac.abort(new Error("cancelled")), 5);
  try {
    await pending;
  } catch (e) {
    console.log("aborted while waiting:", describe(e), Date.now() - started < 2000);
  }

  const later = new AbortController();
  const value = await sleep(1, { id: 7 }, { signal: later.signal });
  later.abort();
  console.log("fired first:", value.id, later.signal.aborted);

  console.log("immediate:", await immediate("now", { signal: new AbortController().signal }));
  try {
    await immediate("never", { signal: AbortSignal.abort() });
  } catch (e) {
    console.log("immediate pre-aborted:", describe(e));
  }

  // ref: false with a signal: another timer keeps the process alive.
  const keepAlive = setTimeout(() => {}, 1000);
  const loose = new AbortController();
  console.log("unref:", await sleep(1, "still fires", { signal: loose.signal, ref: false }));
  clearTimeout(keepAlive);

  try {
    await sleep(1, "x", { signal: {} as unknown as AbortSignal });
  } catch (e) {
    console.log("not a signal:", (e as Error).name, (e as { code?: string }).code, (e as Error).message);
  }

  const order: string[] = [];
  const race = new AbortController();
  const raced = sleep(1000, "x", { signal: race.signal });
  const done = raced.catch(() => order.push("rejected"));
  race.abort();
  void Promise.resolve()
    .then(() => order.push("m1"))
    .then(() => order.push("m2"))
    .then(() => order.push("m3"))
    .then(() => order.push("m4"))
    .then(() => order.push("m5"));
  await done;
  await sleep(1);
  console.log("order:", order.join(" "));

  const fired: string[] = [];
  const quick = new AbortController();
  const settled = sleep(1, "v", { signal: quick.signal }).then((v) => fired.push(v));
  setTimeout(() => {
    void Promise.resolve()
      .then(() => fired.push("n1"))
      .then(() => fired.push("n2"))
      .then(() => fired.push("n3"))
      .then(() => fired.push("n4"));
  }, 1);
  await settled;
  await sleep(5);
  console.log("fire order:", fired.join(" "));
}

void main();
