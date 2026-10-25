// The pMap pattern: a manual Promise.allSettled — concurrent workers over a
// shared counter, results filled BY INDEX into a mapper-less
// Array.from({ length }) array, failures collected as rejected results in
// input order. PromiseSettledResult records keep their value (undefined
// for a void mapper) and their caught reason.

async function pMap<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency: number
): Promise<PromiseSettledResult<R>[]> {
  if (concurrency < 1) concurrency = 1;
  const results = Array.from<PromiseSettledResult<R>>({ length: items.length });
  let nextIdx = 0;

  async function worker(): Promise<void> {
    while (nextIdx < items.length) {
      const idx = nextIdx++;
      try {
        results[idx] = {
          status: "fulfilled",
          value: await fn(items[idx], idx),
        };
      } catch (reason) {
        results[idx] = { status: "rejected", reason };
      }
    }
  }

  const workerCount = concurrency < items.length ? concurrency : items.length;
  const workers = Array.from({ length: workerCount }, () => worker());
  await Promise.all(workers);
  return results;
}

async function work(n: number, idx: number): Promise<void> {
  if (n % 3 === 0) throw new Error("divisible " + n);
  console.log("worked", n, "at", idx);
}

async function main(): Promise<void> {
  const settled = await pMap([1, 2, 3, 4, 5, 6, 7], (n, i) => work(n, i), 3);
  // Settled array is in INPUT order regardless of completion order.
  console.log(settled.map((s) => s.status).join(","));
  console.log(settled.length);
  for (const s of settled) {
    if (s.status === "fulfilled") console.log("value", s.value);
    else console.log("reason", (s.reason as Error).message);
  }

  // Zero items: no workers, empty results.
  const none = await pMap([] as number[], (n, i) => work(n, i), 4);
  console.log("none:", none.length);

  // Concurrency 1 (sequential) and over-provisioned concurrency.
  const seq = await pMap([3, 5], (n, i) => work(n, i), 1);
  console.log(seq.map((s) => s.status).join(","));
  const over = await pMap([9, 10], (n, i) => work(n, i), 16);
  console.log(over.map((s) => s.status).join(","));
}
main();

// Manually-built settled results outside pMap read back whole.
const manual: PromiseSettledResult<number> = { status: "fulfilled", value: 42 };
console.log(manual.status, manual);
const manualRej: PromiseSettledResult<number> = { status: "rejected", reason: "nope" };
console.log(manualRej.status, manualRej);

// Mapper-less Array.from({ length }) with union elements: absent slots ARE
// undefined (JS-exact reads before any write).
const slots = Array.from<string | undefined>({ length: 3 });
console.log(slots.length);
console.log(slots[0] === undefined, slots[2] !== undefined);
slots[1] = "filled";
const s1 = slots[1];
console.log(s1 === undefined ? "undef" : s1);

// ToLength edges: fractions truncate; negative lengths give empty arrays.
console.log(Array.from<number | undefined>({ length: 2.7 }).length);
console.log(Array.from<number | undefined>({ length: -1 }).length);
console.log(Array.from<number | undefined>({ length: 0 }).length);
