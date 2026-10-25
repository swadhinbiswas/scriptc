// A dynamically reached ArrayBuffer answers constructor with the global
// ArrayBuffer, as typed arrays answer theirs.
const items = [new Uint8Array(2), new ArrayBuffer(3), new Float32Array(1)];
for (const item of items) console.log(item.constructor.name, item.constructor === ArrayBuffer);
const b = new ArrayBuffer(4);
console.log(b.constructor.name, b.byteLength);
