// Small Buffers from Buffer.from, Buffer.concat and Buffer.allocUnsafe are
// views into a shared pool slab. Reading a Buffer's window of its
// ArrayBuffer through byteOffset and length gives its own bytes, and
// Buffer.alloc is never pooled.
const small = Buffer.from("hello");
const copy = small.buffer.slice(small.byteOffset, small.byteOffset + small.length);
console.log(copy.byteLength, new TextDecoder().decode(new Uint8Array(copy)));
const view = new Uint8Array(small.buffer, small.byteOffset, small.length);
console.log(Array.from(view).join(","));
const joined = Buffer.concat([Buffer.from("ab"), Buffer.from("cd")]);
const data = new DataView(joined.buffer, joined.byteOffset, joined.length);
console.log(data.getUint16(0), data.byteLength);
const unsafe = Buffer.allocUnsafe(4).fill(7);
console.log(Array.from(new Uint8Array(unsafe.buffer, unsafe.byteOffset, 4)).join(","));
const zeroed = Buffer.alloc(16, 1);
console.log(zeroed.buffer.byteLength, zeroed.byteOffset);
