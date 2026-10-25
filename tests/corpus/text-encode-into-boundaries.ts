import { isAscii, isUtf8 } from "node:buffer";
const encoder = new TextEncoder();
for (const source of ["", "abcdefghi", "é", "世", "😀", "abcdefgé世界😀z", "😀abcdefghi", "a\0b"]) {
  for (let capacity = 0; capacity <= 24; capacity++) {
    const backing = new Uint8Array(28).fill(255);
    const destination = backing.subarray(2, 2 + capacity);
    const result = encoder.encodeInto(source, destination);
    console.log(JSON.stringify(source), capacity, result.read, result.written, Buffer.from(backing).toString("hex"));
  }
}
for (let length = 0; length <= 33; length++) {
  const bytes = new Uint8Array(length).fill(65);
  console.log(length, isAscii(bytes), isUtf8(bytes));
  if (length > 0) {
    bytes[length - 1] = 128;
    console.log(length, isAscii(bytes), isUtf8(bytes));
  }
}
