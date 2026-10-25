// Unchecked element reads can be undefined even when the checker calls them
// numbers. Object literals built from such reads keep `undefined` in every
// field that may hold it, so the values print, compare and default like
// Node's, and records built in a loop allocate no per-field boxes.
const values = [2, 4, 8, 16];

let sum = 0;
let missing = 0;
for (let r = 0; r < 3; r++) {
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    const w = values[i + 1];
    const pair = { v, w };
    sum += (pair.v ?? 0) + (pair.w ?? 0);
    if (pair.w === undefined) missing++;
  }
}
console.log(sum, missing);

const last = values.length - 1;
const head = values[0];
const tail = values[last + 1];
const ends = { head, tail, middle: values[2] };
console.log(ends, ends.tail, ends.tail === undefined, String(ends.tail));
console.log(JSON.stringify(ends), Object.keys(ends).length);

const spans: string[] = [];
for (let i = -1; i <= values.length; i++) {
  const prev = values[i - 1];
  const next = values[i + 1];
  const w = { prev, next };
  spans.push(`${i}:${w.prev}:${w.next}:${(w.next ?? 0) - (w.prev ?? 0)}`);
}
console.log(spans.join(" "));
