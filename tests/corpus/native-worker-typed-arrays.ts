import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";

// Typed-array element reads and writes in a Worker program: views over a
// thread's own ArrayBuffer and views over a SharedArrayBuffer go through the
// same functions, including clamping, wrapping, float narrowing, holes past
// the end (reads give undefined, writes are ignored) and negative indices.

function fill(bytes: Uint8Array, words: Int32Array, clamped: Uint8ClampedArray, floats: Float32Array): void {
  for (let i = 0; i < bytes.length + 2; i++) bytes[i] = i * 97 + 300;
  for (let i = 0; i < words.length; i++) words[i] = (i - 2) * 1_000_000_007;
  for (let i = 0; i < clamped.length; i++) clamped[i] = i * 90 - 40.5;
  for (let i = 0; i < floats.length; i++) floats[i] = i / 3;
  bytes[-1] = 9;
}

function sum(bytes: Uint8Array, words: Int32Array, clamped: Uint8ClampedArray, floats: Float32Array): string {
  let total = 0;
  for (let i = 0; i < bytes.length; i++) total += bytes[i]!;
  let mixed = 0;
  for (let i = 0; i < words.length; i++) mixed = (mixed ^ words[i]!) | 0;
  const tail = bytes[bytes.length];
  return `${total} ${mixed} ${Array.from(clamped).join(",")} ${floats[1]} ${floats[2]! * 3} ${tail} ${bytes[-1]}`;
}

function run(label: string, buffer: ArrayBuffer | SharedArrayBuffer): string {
  const bytes = new Uint8Array(buffer, 0, 8);
  const words = new Int32Array(buffer, 8, 4);
  const clamped = new Uint8ClampedArray(buffer, 24, 4);
  const floats = new Float32Array(buffer, 28, 3);
  fill(bytes, words, clamped, floats);
  return `${label}: ${sum(bytes, words, clamped, floats)}`;
}

if (isMainThread) {
  const shared = new SharedArrayBuffer(40);
  console.log(run("main own", new ArrayBuffer(40)));
  console.log(run("main shared", shared));
  const worker = new Worker(new URL(import.meta.url), { workerData: shared });
  worker.on("message", (line: string) => {
    console.log(line);
  });
  worker.on("exit", (code: number) => {
    // The worker rewrote the shared buffer; the main thread sees its bytes.
    const view = new Uint8Array(shared, 0, 8);
    console.log(`after worker exit ${code}: ${Array.from(view).join(",")}`);
  });
} else {
  const shared = workerData as SharedArrayBuffer;
  parentPort!.postMessage(run("worker own", new ArrayBuffer(40)));
  const view = new Uint8Array(shared, 0, 8);
  for (let i = 0; i < view.length; i++) view[i] = view[i]! + 1;
  parentPort!.postMessage(run("worker shared", shared));
  for (let i = 0; i < view.length; i++) view[i] = 255 - i;
}
