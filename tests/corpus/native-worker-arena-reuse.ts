import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";

// Workers that hold and then drop tens of megabytes of small objects, and later workers that
// allocate as much again once the first ones have exited (in scriptc on Linux, the first ones
// return those pages when they exit and the later ones reuse them).
type Item = { value: number; next: Item | undefined; tags: number[]; label: string };

if (isMainThread) {
  for (let wave = 0; wave < 2; wave++) {
    const results = await Promise.all(
      [1, 2, 3].map(
        (k) =>
          new Promise<number>((resolve, reject) => {
            let result = -1;
            const worker = new Worker(new URL(import.meta.url), { workerData: wave * 10 + k });
            worker.once("message", (value: unknown) => {
              result = value as number;
            });
            worker.once("error", reject);
            worker.once("exit", () => resolve(result));
          }),
      ),
    );
    console.log("wave", wave, results.join(" "));
  }
} else {
  const round = workerData as number;
  let items: Item[] = [];
  for (let i = 0; i < 300_000; i++)
    items.push({ value: i * round, next: undefined, tags: [i & 7, round, i % 13], label: "item" + (i % 97) });
  // A few items survive the rest, linked together.
  const kept: Item[] = [];
  for (let i = 0; i < items.length; i += 4096) kept.push(items[i]!);
  for (let i = 1; i < kept.length; i++) kept[i - 1]!.next = kept[i];
  let sum = 0;
  for (const item of items) sum = (sum + item.value + item.tags[2]! + item.label.length) % 1_000_003;
  items = [];
  let walk = 0;
  for (let item: Item | undefined = kept[0]; item !== undefined; item = item.next)
    walk = (walk + item.tags[0]! + item.tags[1]! + item.label.length) % 1_000_003;
  // Fresh objects after the drop.
  const fresh: Item[] = [];
  for (let i = 0; i < 100_000; i++) fresh.push({ value: i, next: undefined, tags: [], label: "" });
  let empty = 0;
  for (const item of fresh) if (item.next === undefined && item.tags.length === 0 && item.label === "") empty++;
  parentPort!.postMessage((sum + walk + empty) % 1_000_003);
}
