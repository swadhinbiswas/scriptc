// Bulk operations on SharedArrayBuffer-backed views: fill, copyWithin,
// slice, set across element kinds, sort with and without a comparator,
// toReversed, DataView and Buffer number reads and writes, string
// conversions, searches and comparisons, and Buffer.write.
const shared = new SharedArrayBuffer(64);
const bytes = new Uint8Array(shared);
const ints = new Int32Array(shared, 16, 8);
const floats = new Float64Array(shared, 48, 2);

bytes.fill(7, 0, 8);
bytes.copyWithin(8, 0, 4);
console.log(bytes.slice(0, 16).join(","), bytes.subarray(4, 10).join(","));

ints.set([5, -3, 9, 1, 0, -8, 4, 2]);
ints.sort();
console.log(ints.join(","), ints.toReversed().join(","));
ints.sort((a, b) => b - a);
console.log(ints.join(","), Array.from(ints.slice(2, 5)).join(","));

const halves = new Int16Array(shared, 0, 8);
halves.set(ints.subarray(0, 4));
console.log(halves.join(","), Atomics.load(halves, 1));

floats.set([1.5, -2.25]);
const view = new DataView(shared);
view.setUint16(2, 0xbeef, true);
view.setFloat32(4, 3.5);
console.log(view.getUint16(2, true).toString(16), view.getFloat32(4), view.getFloat64(48, true), floats[1]);

const buf = Buffer.from(shared, 0, 16);
buf.write("héllo", 0, "utf8");
console.log(buf.toString("utf8", 0, 6), buf.toString("hex", 0, 8), buf.toString("base64", 0, 6));
buf.writeInt32BE(-123456, 8);
buf.writeUInt16LE(0x1234, 12);
console.log(buf.readInt32BE(8), buf.readUInt16LE(12).toString(16), buf.readUIntBE(8, 3), buf.readBigUInt64LE(8));
console.log(buf.indexOf("llo"), buf.indexOf(0x34), buf.includes("hé"), buf.lastIndexOf(0x12));

const other = Buffer.alloc(16);
buf.copy(other, 0, 0, 16);
console.log(other.equals(buf), Buffer.compare(other, buf), other.compare(buf, 0, 8, 0, 8));
other[0] = 0;
console.log(other.equals(buf), Buffer.compare(other, buf), buf.compare(other));
buf.fill("ab", 0, 5);
console.log(buf.toString("latin1", 0, 6), buf.swap16().toString("hex", 0, 6));
console.log(new Uint8Array(shared, 0, 8).join(" "));
