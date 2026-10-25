function bufferRecords(bytes: Buffer): number {
  let checksum = 0;
  for (let offset = 0; offset <= bytes.length - 12; offset += 12) {
    const id = bytes.readUInt32LE(offset);
    const delta = bytes.readIntLE(offset + 4, 3);
    const flags = bytes.readUInt8(offset + 7);
    const value = bytes.readFloatLE(offset + 8);
    bytes.writeUInt32BE((id + flags) >>> 0, offset);
    bytes.writeIntBE(delta, offset + 4, 3);
    bytes.writeFloatBE(value * 2, offset + 8);
    checksum = Math.imul(checksum ^ id, 17) + delta;
  }
  return checksum;
}

function viewRecords(view: DataView, little: boolean): number {
  let checksum = 0;
  for (let offset = 0; offset <= view.byteLength - 12; offset += 12) {
    const id = view.getUint32(offset, little);
    const delta = view.getInt16(offset + 4, little);
    const flags = view.getUint16(offset + 6, little);
    view.setUint32(offset, (id + flags) >>> 0, !little);
    view.setInt16(offset + 4, delta, !little);
    view.setFloat32(offset + 8, view.getFloat32(offset + 8, little) * 2, !little);
    checksum = Math.imul(checksum ^ id, 17) + delta;
  }
  return checksum;
}

function backwards(view: DataView): void {
  for (let offset = view.byteLength - 4; offset >= 0; offset -= 4) {
    view.setUint32(offset, view.getUint32(offset, true) ^ 0x80000000);
  }
}

const storage = Buffer.alloc(51, 0x5a);
const window = storage.subarray(1, 49);
for (let i = 0; i < 4; i++) {
  const offset = i * 12;
  window.writeUInt32LE(0xffffffff - i, offset);
  window.writeIntLE(-8388608 + i, offset + 4, 3);
  window.writeUInt8(i, offset + 7);
  window.writeFloatLE(i === 0 ? -0 : i / 4, offset + 8);
}
console.log("buffer", bufferRecords(window), storage.toString("hex"));
const view = new DataView(storage.buffer, storage.byteOffset + 1, 48);
console.log("view", viewRecords(view, false), viewRecords(view, true));
backwards(view);
console.log("reverse", storage.toString("hex"));
console.log("empty", bufferRecords(Buffer.alloc(0)), viewRecords(new DataView(new ArrayBuffer(0)), true));

function wideFields(bytes: Buffer): number {
  bytes.writeIntBE(-549755813887, 1, 5);
  const signed = bytes.readIntBE(1, 5);
  bytes.writeUIntLE(281474976710655, 6, 6);
  const unsigned = bytes.readUIntLE(6, 6);
  bytes.writeIntLE(signed, 12, 5);
  bytes.writeUIntBE(unsigned, 17, 6);
  return signed + unsigned;
}
const wide = Buffer.alloc(24, 0x33);
console.log("wide", wideFields(wide), wide.toString("hex"));

// A valid bound for one receiver does not prove a different view's extent.
function shortTarget(source: Buffer, target: Buffer): void {
  for (let offset = 0; offset <= source.length - 4; offset += 4) {
    target.writeUInt32BE(source.readUInt32LE(offset), offset);
  }
}
try { shortTarget(Buffer.alloc(8, 1), Buffer.alloc(5)); }
catch (error) { if (error instanceof Error) console.log("short", error.name, error.message); }

function replacedBound(input: Buffer): number {
  const length = input.length;
  input = Buffer.alloc(2);
  let total = 0;
  for (let offset = 0; offset <= length - 4; offset += 4) total += input.readUInt32LE(offset);
  return total;
}
try { console.log(replacedBound(Buffer.alloc(8))); }
catch (error) { if (error instanceof Error) console.log("replaced", error.name, error.message); }

let current = Buffer.alloc(4, 0x11);
function replaceBuffer(): number { current = Buffer.alloc(4, 0x22); return 0; }
console.log("snapshot", current.readUInt32LE(replaceBuffer()), current.readUInt32LE(0));
let currentView = new DataView(new ArrayBuffer(4));
const oldView = currentView;
function replaceView(): number { currentView = new DataView(new ArrayBuffer(4)); return 0x12345678; }
oldView.setUint32(0, 1);
currentView.setUint32(0, replaceView());
console.log("view-snapshot", oldView.getUint32(0), currentView.getUint32(0));

function offsets(view: DataView, offset: number, value: number): void {
  view.setInt16(offset, value, true);
  console.log("offset", offset, view.getInt16(offset, true));
}
for (const offset of [NaN, -0, -0.75, 1.75, 2, 2.75, -1, Infinity, 4294967296, 9007199254740992]) {
  try { offsets(currentView, offset, 4294967295.75); }
  catch (error) { if (error instanceof Error) console.log("offset-error", error.name, error.message); }
}

// The value error still precedes the offset error on the checked path.
try { current.writeUInt16LE(-1, NaN); }
catch (error) { if (error instanceof Error) console.log("order", error.name, error.message); }
