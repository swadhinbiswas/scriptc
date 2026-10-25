// Concurrent interning from worker threads: every thread interns the same
// set of type-like objects under string keys (each object refers to two
// previously interned ones) and records under number keys, then looks keys
// up (hits and misses). Arguments: the store ("table" for one shared
// InternTable per kind of key, "map" for a module-level Map per thread, the
// layout programs use without shared tables), the thread count and the key
// count. Under Node.js both stores are per-thread Maps.
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";
import { InternTable } from "@scriptc/experimental";

class Shape {
  readonly id: number;
  readonly name: string;
  readonly left: Shape | undefined;
  readonly right: Shape | undefined;
  constructor(id: number, name: string, left: Shape | undefined, right: Shape | undefined) {
    this.id = id;
    this.name = name;
    this.left = left;
    this.right = right;
  }
}

type Span = { start: number; length: number };

const shapeTable = new InternTable<string, Shape>("bench.shapes");
const spanTable = new InternTable<number, Span>("bench.spans");
const shapeMap = new Map<string, Shape>();
const spanMap = new Map<number, Span>();

function makeShape(id: number, name: string, useTable: boolean): Shape {
  const left = id > 0 ? shape(Math.floor(id / 2), useTable) : undefined;
  const right = id > 2 ? shape(Math.floor(id / 3), useTable) : undefined;
  return new Shape(id, name, left, right);
}

function shape(id: number, useTable: boolean): Shape {
  const key = `shape:${id}`;
  if (useTable) return shapeTable.getOrInsertComputed(key, () => makeShape(id, key, true));
  let s = shapeMap.get(key);
  if (s === undefined) {
    s = makeShape(id, key, false);
    shapeMap.set(key, s);
  }
  return s;
}

function span(k: number, useTable: boolean): Span {
  if (useTable) return spanTable.getOrInsertComputed(k, () => ({ start: k * 3, length: k % 17 }));
  let s = spanMap.get(k);
  if (s === undefined) {
    s = { start: k * 3, length: k % 17 };
    spanMap.set(k, s);
  }
  return s;
}

function run(useTable: boolean, seed: number, keys: number): string {
  let sum = 0;
  // Interning: each thread walks the keys from its own starting point, so
  // threads insert different keys at first and then find each other's.
  for (let n = 0; n < keys; n++) {
    const id = (n + seed * Math.floor(keys / 8)) % keys;
    const s = shape(id, useTable);
    sum = (sum + s.id + (s.left?.id ?? 0)) % 1000000007;
    sum = (sum + span(id * 7, useTable).length) % 1000000007;
  }
  // Lookups: three hits and one miss per key, of each kind.
  let hits = 0;
  for (let round = 0; round < 3; round++)
    for (let n = 0; n < keys; n++) {
      const id = (n * 7919 + round) % keys;
      const key = `shape:${id}`;
      const s = useTable ? shapeTable.get(key) : shapeMap.get(key);
      if (s !== undefined && s.name === key) hits++;
      const p = useTable ? spanTable.get(id * 7) : spanMap.get(id * 7);
      if (p !== undefined && p.start === id * 21) hits++;
    }
  let misses = 0;
  for (let n = 0; n < keys; n++) {
    const absent = useTable ? shapeTable.has(`shape:-${n + 1}`) : shapeMap.has(`shape:-${n + 1}`);
    if (!absent) misses++;
    if (!(useTable ? spanTable.has(n * 7 + 1) : spanMap.has(n * 7 + 1))) misses++;
  }
  return `sum=${sum} hits=${hits} misses=${misses}`;
}

if (isMainThread) {
  const store = process.argv[2] ?? "table";
  const threads = Number(process.argv[3] ?? "8");
  const keys = Number(process.argv[4] ?? "100000");
  const results: string[] = [];
  let pending = threads;
  for (let t = 0; t < threads; t++) {
    const worker = new Worker(new URL(import.meta.url), {
      workerData: { useTable: store === "table", seed: t, keys },
    });
    worker.on("message", (message: unknown) => {
      results[t] = message as string;
    });
    worker.on("exit", () => {
      if (--pending === 0) for (let i = 0; i < threads; i++) console.log(`thread ${i}: ${results[i]}`);
    });
  }
} else {
  const data = workerData as { useTable: boolean; seed: number; keys: number };
  parentPort!.postMessage(run(data.useTable, data.seed, data.keys));
}
