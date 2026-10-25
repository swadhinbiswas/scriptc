function neighbors(values: Uint32Array): number {
  const last = values.length - 1;
  let sum = 0;
  for (let i = 0; i < last; i++) sum += values[i] ^ values[i + 1];
  return sum;
}
function backwards(values: Uint32Array): number {
  let sum = 0;
  for (let i = values.length; i > 0; i--) sum += values[i - 1];
  return sum;
}
function strided(values: Uint32Array): number {
  let sum = 0;
  for (let i = 1; i < values.length; i += 2) sum += values[i] + values[i - 1];
  return sum;
}
for (const length of [0, 1, 2, 7, 16]) {
  const values = new Uint32Array(length);
  for (let i = 0; i < values.length; i++) values[i] = Math.imul(i, 17);
  console.log("bounds", length, neighbors(values), backwards(values), strided(values));
}
function changedReceiver(): string {
  let values = new Uint32Array(8);
  const length = values.length;
  values = new Uint32Array([1, 2]);
  for (let i = 0; i < length; i++) values[i] = i + 10;
  return Array.from(values).join(",");
}
function replacedInBody(): string {
  let values = new Uint32Array([1, 2, 3]);
  const saved = values;
  const replacement = new Uint32Array(1);
  for (let i = 0; i < values.length; i++) values[i] = (values = replacement, i + 5);
  return `${Array.from(saved).join(",")}/${Array.from(replacement).join(",")}`;
}
console.log("replacement", changedReceiver(), replacedInBody());
function shortOutput(values: Uint32Array): string {
  const out = new Uint32Array(2);
  for (let i = 0; i < values.length; i++) out[i] = values[i] + 7;
  return Array.from(out).join(",");
}
console.log("output", shortOutput(new Uint32Array([1, 2, 3, 4])));
const backing = new Uint32Array([1, 2, 3, 4, 5, 6]);
const input = backing.subarray(0, 4);
const output = backing.subarray(1, 5);
for (let i = 0; i < input.length; i++) output[i] = input[i] + 10;
console.log("overlap", Array.from(backing).join(","));
function wideIndex(input: number): string {
  const values = new Uint32Array([1, 2]);
  let index = input >>> 0;
  values[index + 4294967296] = 77;
  values[-(index + 4294967296)] = 66;
  if ((index & 1) === 0) index += 4294967296;
  else index = -index;
  values[index] = 99;
  values[index + 1] = 88;
  return Array.from(values).join(",");
}
console.log("wide", wideIndex(0), wideIndex(1));
function roundedOffset(): string {
  const values = new Uint32Array(4);
  for (let i = 0; i < values.length; i++) values[(i + 9007199254740991) - 9007199254740991] = i + 10;
  return Array.from(values).join(",");
}
console.log("rounded-offset", roundedOffset());
