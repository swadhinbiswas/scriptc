// Typed-array reads at unproven indices, past the end (undefined, so NaN,
// so 0 after `| 0`), and compares of bitwise locals in loops: signed and
// unsigned elements, values above 2^31, and counters that leave the array.

function scanUntil(units: Uint16Array, start: number, stop: number): number {
  let pos = start | 0;
  const end = (units.length + 2) | 0;
  while (pos < end) {
    const c = units[pos] | 0;
    if (c === stop || c === 0) break;
    pos = (pos + 1) | 0;
  }
  return pos;
}

function classify32(values: Int32Array, extra: number): string {
  const out: string[] = [];
  for (let i = 0; i < values.length + extra; i = (i + 1) | 0) {
    const v = values[i] | 0;
    const u = values[i] >>> 0;
    let kind = "";
    if (v < 0) kind += "neg";
    else if (v === 0) kind += "zero";
    else if (v <= 127) kind += "small";
    else kind += "big";
    if (u > 2147483647) kind += "/high";
    out.push(`${i}:${kind}`);
  }
  return out.join(" ");
}

function classifyU32(values: Uint32Array, extra: number): string {
  const out: string[] = [];
  for (let i = 0; i < values.length + extra; i = (i + 1) | 0) {
    const v = values[i] | 0;
    const u = values[i] >>> 0;
    let kind = "";
    if (v < 0) kind += "neg";
    else if (v === 0) kind += "zero";
    else if (v <= 127) kind += "small";
    else kind += "big";
    if (u > 2147483647) kind += "/high";
    out.push(`${i}:${kind}`);
  }
  return out.join(" ");
}

function classify16(values: Int16Array, extra: number): string {
  const out: string[] = [];
  for (let i = 0; i < values.length + extra; i = (i + 1) | 0) {
    const v = values[i] | 0;
    const u = values[i] >>> 0;
    let kind = "";
    if (v < 0) kind += "neg";
    else if (v === 0) kind += "zero";
    else if (v <= 127) kind += "small";
    else kind += "big";
    if (u > 2147483647) kind += "/high";
    out.push(`${i}:${kind}`);
  }
  return out.join(" ");
}

function classify8(values: Int8Array, extra: number): string {
  const out: string[] = [];
  for (let i = 0; i < values.length + extra; i = (i + 1) | 0) {
    const v = values[i] | 0;
    const u = values[i] >>> 0;
    let kind = "";
    if (v < 0) kind += "neg";
    else if (v === 0) kind += "zero";
    else if (v <= 127) kind += "small";
    else kind += "big";
    if (u > 2147483647) kind += "/high";
    out.push(`${i}:${kind}`);
  }
  return out.join(" ");
}

function countBetween(bytes: Uint8Array, lo: number, hi: number): number {
  let n = 0;
  for (let i = 0; i <= bytes.length; i = (i + 1) | 0) {
    const b = bytes[i] & 255;
    if (b >= lo && b <= hi) n = (n + 1) | 0;
    const x = bytes[i] ^ 0;
    if (x !== b) n = (n + 1000) | 0;
  }
  return n;
}

function mixed(units: Uint16Array): number {
  let h = 0;
  let i = 0;
  while (i < units.length + 3) {
    const c = units[i] | 0;
    const d = ~units[i + 1];
    if (c > 64 && d < -65) h = (Math.imul(h, 31) + c) | 0;
    else if (c === 0) h = h ^ 0x5bd1e995;
    i = (i + 1) | 0;
  }
  return h;
}

const text = "abc/*x*/def\nghi*jk\u00e9\u4e2d\uffff";
const units = new Uint16Array(text.length);
for (let i = 0; i < text.length; i++) units[i] = text.charCodeAt(i);
console.log(scanUntil(units, 0, 42), scanUntil(units, 3, 10), scanUntil(units, 0, 7), scanUntil(units, -2, 99));
console.log(scanUntil(units, 2.5, 42), scanUntil(units, units.length - 1, 42), scanUntil(units, 1e10, 42));

const i32 = new Int32Array([0, -1, 1, 127, 128, -2147483648, 2147483647, 65536]);
const u32 = new Uint32Array([0, 1, 4294967295, 2147483648, 2147483647, 300]);
const i16 = new Int16Array([-32768, 32767, -1, 0, 5]);
const i8 = new Int8Array([-128, 127, -1, 0]);
console.log(classify32(i32, 2));
console.log(classifyU32(u32, 1));
console.log(classify16(i16, 0));
console.log(classify8(i8, 3));

const bytes = new Uint8Array(64);
for (let i = 0; i < bytes.length; i++) bytes[i] = (i * 37 + 11) & 255;
console.log(countBetween(bytes, 0, 0), countBetween(bytes, 32, 126), countBetween(bytes, 200, 255));
console.log(mixed(units), mixed(new Uint16Array(0)), mixed(new Uint16Array([65, 66, 0, 120])));
