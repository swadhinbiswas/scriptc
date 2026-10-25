// Array.fromAsync over arrays of values and of promises, with and without a
// mapping function, interleaved with other promise jobs: every result,
// rejection and iterator close lands on the microtask Node uses. Node.js prints
// the same.
const log: string[] = [];
async function ticker(n: number): Promise<void> {
  for (let i = 0; i < n; i++) {
    log.push("t" + i);
    await null;
  }
}
function report(label: string, job: Promise<number[]>): Promise<number> {
  return job.then(
    (a) => log.push(label + " " + a.join(",")),
    (e) => log.push(label + " caught " + (e as Error).message),
  );
}
async function main(): Promise<void> {
  const tick = ticker(24);
  const jobs = [
    report("values", Array.fromAsync([1, 2, 3])),
    report("promises", Array.fromAsync([Promise.resolve(4), Promise.resolve(5)])),
    report("empty", Array.fromAsync([] as number[])),
    report("map", Array.fromAsync([1, 2], (x: number, i: number) => x * 2 + i)),
    report("async map", Array.fromAsync([1, 2], async (x: number) => x + 1)),
    report("promise map", Array.fromAsync([3, 4], (x: number) => Promise.resolve(x * x))),
    report("promises async map", Array.fromAsync([Promise.resolve(1), Promise.resolve(2)], async (x: number) => x * 5)),
    report(
      "map throws",
      Array.fromAsync([1, 2], (x: number) => {
        if (x === 2) throw new Error("map failed");
        return x;
      }),
    ),
    report(
      "async map rejects",
      Array.fromAsync([1, 2, 3], async (x: number) => {
        if (x === 2) throw new Error("async map failed");
        return x;
      }),
    ),
    report("first rejected", Array.fromAsync([Promise.reject(new Error("first")), Promise.resolve(1)])),
    report("second rejected", Array.fromAsync([Promise.resolve(1), Promise.reject(new Error("second"))])),
    report(
      "later",
      Array.fromAsync([new Promise<number>((resolve) => setTimeout(() => resolve(7), 1)), Promise.resolve(8)]),
    ),
  ];
  log.push("sync end");
  await Promise.all(jobs);
  await tick;
  console.log(log.join("\n"));
  const strings = await Array.fromAsync(["a", "b"], async (s: string, i: number) => s.repeat(i + 1));
  console.log(strings.join("|"), strings.length);
}
main();
