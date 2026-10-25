const source = Buffer.alloc(64);
for (let offset = 0; offset < source.length; offset += 4) source.writeUInt32LE(offset * 73, offset);
const view = new DataView(source.buffer, source.byteOffset, source.byteLength);
let checksum = 0;
for (let offset = 0; offset < view.byteLength; offset += 4) {
  checksum = (Math.imul(checksum ^ view.getUint32(offset, true), 31) + offset) >>> 0;
}
console.log(checksum, source.readUInt32LE(60));

const packed = Buffer.alloc(source.length);
let position = 0;
for (let offset = 0; offset < source.length; offset += 4) {
  const value = source.readUInt32LE(offset);
  if ((value & 4) === 0) continue;
  packed.writeUInt32BE(value, position);
  position += 4;
}
console.log(position, packed.subarray(0, position).toString("hex"));

let fractional = 0;
for (let i = 0; i < 8; i += 2) {
  fractional += 0.5;
  console.log(fractional);
}
let large = Number.MAX_SAFE_INTEGER;
for (let i = 0; i < 4; i += 2) { large += 2; console.log(large); }
let nested = 0;
for (let i = 0; i < 4; i += 2) {
  for (let j = 0; j < 10; j++) nested += 3;
  console.log(nested);
}

// A called function can replace a shared binding during the loop.
let shared = Buffer.from([1, 2, 3, 4]);
let sharedNumber = 0;
function replace(): void {
  shared = Buffer.from([9]);
  sharedNumber = 1.5;
}
let sum = 0;
for (let i = 0; i < shared.length; i++) {
  sum += shared.readUInt8(i);
  if (i === 0) replace();
  sum += sharedNumber;
}
console.log(sum, shared.length, sharedNumber);

// Integer views snapshot operands even when a later operand assigns.
let state = 0;
for (let i = 0; i < 3; i++) {
  console.log(state ^ (state = i + 0.75), state);
  state = (state + 4294967295) >>> 0;
}
let exceptional = -0;
for (let i = 0; i < 2; i++) {
  console.log(Object.is(exceptional, -0), exceptional | 0);
  exceptional = Infinity;
}

// The last field extends beyond a valid starting offset.
const short = Buffer.alloc(7);
try {
  for (let i = 0; i < short.length; i += 4) console.log(short.readUInt32LE(i));
} catch (error) {
  console.log((error as Error).name);
}
