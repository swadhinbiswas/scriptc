import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";
import { InternTable } from "@scriptc/experimental";

// InternTable (@scriptc/experimental) with array keys: arrays of numbers or
// of strings compare by their elements (numbers by SameValueZero, strings
// by content), so a freshly built key finds the value stored under an equal
// one. Workers intern list types keyed by their member ids. Node.js prints
// the same.

class List {
  readonly members: readonly number[];
  readonly label: string;
  constructor(members: readonly number[], label: string) {
    this.members = members;
    this.label = label;
  }
}

const lists = new InternTable<readonly number[], List>("arrays.lists");
const paths = new InternTable<readonly string[], number>("arrays.paths");

function listOf(members: readonly number[]): List {
  return lists.getOrInsertComputed(members, (key) => new List([...key], key.join("|")));
}

if (isMainThread) {
  const a = listOf([1, 2, 3]);
  const b = listOf([1, 2, 3]);
  const c = listOf([1, 2]);
  const d = listOf([3, 2, 1]);
  console.log(a === b, a === c, a === d, a.label, c.label, d.label, lists.size);
  console.log(lists.get([1, 2, 3]) === a, lists.get([1, 2, 3, 4]), lists.has([1, 2]), lists.has([2, 1]));
  // SameValueZero elements.
  const z = listOf([-0, NaN]);
  console.log(listOf([0, 0 / 0]) === z, lists.has([0, NaN]), lists.has([NaN, 0]), lists.size);
  // Empty and long keys.
  const empty = listOf([]);
  const long: number[] = [];
  for (let i = 0; i < 500; i++) long.push(i * 1.5);
  const big = listOf(long);
  console.log(listOf([]) === empty, empty.label === "", listOf([...long]) === big, big.members.length);
  long.push(1);
  console.log(lists.has(long), lists.size);
  // Holes differ from numbers.
  const holed = new Array<number>(3);
  holed[0] = 1;
  const again = new Array<number>(3);
  again[0] = 1;
  console.log(listOf(holed).members.length, listOf(again) === listOf(holed), lists.has([1, 0, 0]), lists.has([1]));

  // String arrays compare by content, element by element.
  console.log(paths.getOrInsert(["ab", "c"], 1), paths.getOrInsert(["a", "bc"], 2), paths.getOrInsert(["ab", "c"], 3));
  console.log(paths.get(["a" + "b", "c"]), paths.get(["abc"]), paths.get([]), paths.getOrInsert([], 4), paths.get([""]));
  console.log(paths.getOrInsert([""], 5), paths.getOrInsert(["", ""], 6), paths.get([""]), paths.size);

  const results: string[] = [];
  let pending = 3;
  for (let w = 0; w < 3; w++) {
    const worker = new Worker(new URL(import.meta.url), { workerData: { seed: w } });
    worker.on("message", (message: unknown) => {
      results[w] = message as string;
    });
    worker.on("exit", () => {
      if (--pending === 0) for (const line of results) console.log(line);
    });
  }
} else {
  const { seed } = workerData as { seed: number };
  let total = 0;
  let bad = 0;
  for (let n = 0; n < 5000; n++) {
    const k = (n * 13 + seed * 1667) % 5000;
    const members = [k % 7, k % 11, k];
    const list = listOf(members);
    if (list.label !== members.join("|")) bad++;
    total += list.members[2]!;
  }
  parentPort!.postMessage(`worker ${seed}: total=${total} bad=${bad}`);
}
