// ArrayBuffer and SharedArrayBuffer inspection: Node's formatArrayBuffer
// `[Uint8Contents]: <hex pairs>` entry (the first 100 bytes, then
// `... N more byte(s)`) plus the byteLength entry inside the class
// braces, breaking onto lines past the 80-column budget, nested in
// objects and arrays, `[ArrayBuffer]` beyond the depth limit, and the
// backing buffer of a non-byte typed array.
import { inspect } from "node:util";

for (const n of [0, 1, 3, 16, 17, 18, 19, 20, 24, 100, 101, 102, 300]) {
  const ab = new ArrayBuffer(n);
  const view = new Uint8Array(ab);
  for (let i = 0; i < n; i++) view[i] = (i * 37) & 255;
  console.log(n, ab);
}

const small = new ArrayBuffer(2);
console.log({ a: small, b: [small] });
console.log({ deep: { deeper: { deepest: { ab: small } } } });
console.log([new ArrayBuffer(40), 1]);
console.log(inspect(small));
console.log(`${inspect({ x: new ArrayBuffer(4) })}`);

console.log(new SharedArrayBuffer(3));

const f64 = new Float64Array(2);
f64[0] = 1.5;
console.log(f64.buffer);
