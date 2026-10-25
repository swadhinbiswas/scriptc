// Loop accumulators updated with `>>> 0` keep their uint32 range across
// iterations: hashes, checksums and DataView sums whose values cross 2^31,
// with the add before the coercion computed exactly (it can exceed 2^32)
// and ToUint32 applied to -0, NaN, fractions and huge inputs.
function show(label: string, value: number): void {
  console.log(label, value, value | 0, value / 2, Object.is(value, -0), 1 / value);
}

function djb2(text: string): number {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = (h * 33 + text.charCodeAt(i)) >>> 0;
  return h;
}

function fnv1a(bytes: Uint8Array): number {
  let h = 2166136261;
  for (let i = 0; i < bytes.length; i++) h = Math.imul(h ^ bytes[i]!, 16777619) >>> 0;
  return h;
}

function sumAbove(n: number): number {
  // Every term is near 2^31, so the running sum crosses 2^31 and 2^32.
  let acc = 0;
  let above = 0;
  for (let i = 0; i < n; i++) {
    acc = (acc + 2147483600 + i) >>> 0;
    if (acc > 2147483647) above++;
  }
  console.log("above", above, acc > 2147483647, acc >= 0);
  return acc;
}

function rotate(n: number): number {
  let acc = 2863311530;
  for (let i = 0; i < n; i++) acc = ((acc << 1) | (acc >>> 31)) >>> 0;
  let x = acc;
  while (x > 4000000000) x = (x - 123456789) >>> 0;
  return (acc + x) >>> 0;
}

function adler(bytes: Uint8Array): number {
  let a = 1,
    b = 0;
  for (let i = 0; i < bytes.length; i++) {
    a = (a + bytes[i]!) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

function coerced(values: number[]): void {
  // Unknown inputs: the sum is a double and ToUint32 handles every edge.
  let acc = 4294967295;
  for (let i = 0; i < values.length; i++) {
    acc = (acc + values[i]!) >>> 0;
    console.log("coerced", i, acc);
  }
  show("coerced", acc);
}

function mixed(n: number): number {
  // Signed and unsigned writes to one local: neither closure applies.
  let acc = 0;
  for (let i = 0; i < n; i++) {
    if ((i & 1) === 0) acc = (acc + 3000000000) >>> 0;
    else acc = (acc + 3000000000) | 0;
  }
  return acc;
}

function sumWords(words: Uint32Array): number {
  let acc = 0;
  let i = 0;
  do {
    acc = (acc + words[i]! + words[words.length - 1 - i]!) >>> 0;
    i++;
  } while (i < words.length);
  return acc;
}

function sumLE(v: DataView): number {
  let s = 0;
  for (let o = 0; o + 4 <= v.byteLength; o += 4) s = (s + v.getUint32(o, true)) >>> 0;
  return s;
}
function sumVar(v: DataView, le: boolean): number {
  let s = 0;
  for (let o = 0; o + 4 <= v.byteLength; o += 4) s = (s + v.getUint32(o, le)) >>> 0;
  return s;
}
function sumBE(v: DataView): number {
  let s = 0;
  for (let i = 0; i < v.byteLength >>> 2; i++) s = (s + v.getUint32(i * 4)) >>> 0;
  return s;
}
function sumOdd(v: DataView): number {
  let s = 0;
  for (let o = 1; o + 4 <= v.byteLength; o += 3) s = (s + v.getUint32(o, true)) >>> 0;
  return s;
}
function sumSigned(v: DataView): number {
  let s = 0;
  for (let o = 0; o + 4 <= v.byteLength; o += 4) s = (s + v.getInt32(o, true)) >>> 0;
  return s;
}
function sum16(v: DataView): number {
  let s = 0;
  for (let o = 0; o + 2 <= v.byteLength; o += 2) s = (s * 31 + v.getUint16(o)) >>> 0;
  return s;
}

function main(): void {
  const text = "The quick brown fox jumps over the lazy dog";
  show("djb2", djb2(text));
  const bytes = new Uint8Array(1000);
  for (let i = 0; i < bytes.length; i++) bytes[i] = (i * 7 + 3) & 255;
  show("fnv1a", fnv1a(bytes));
  show("adler", adler(bytes));
  show("sumAbove", sumAbove(10));
  show("sumAbove", sumAbove(1000));
  show("rotate", rotate(37));
  coerced([-0, 0.5, -0.5, 1.5, -1.5, NaN, 1, Infinity, 2 ** 53 + 2, -(2 ** 32), 2 ** 31, -1]);
  show("mixed", mixed(5));
  show("mixed", mixed(6));

  const words = new Uint32Array(64);
  for (let i = 0; i < words.length; i++) words[i] = Math.imul(i + 1, 2654435761) >>> 0;
  show("words", sumWords(words));

  const buf = new ArrayBuffer(4096);
  const v = new DataView(buf);
  for (let o = 0; o + 4 <= v.byteLength; o += 4)
    v.setUint32(o, (Math.imul(o + 1, 2246822519) >>> 0) | 0x80000000, true);
  show("sumLE", sumLE(v));
  show("sumVar", sumVar(v, true));
  show("sumVar", sumVar(v, false));
  show("sumBE", sumBE(v));
  show("sumOdd", sumOdd(new DataView(buf, 3, 1001)));
  show("sumSigned", sumSigned(v));
  show("sum16", sum16(v));
  show("empty", sumLE(new DataView(buf, 0, 3)));

  let total = 0;
  for (let r = 0; r < 4; r++) {
    v.setUint32(r * 4, 4294967295 - r, true);
    total = (total + sumLE(v) + sumBE(v)) >>> 0;
  }
  show("total", total);
}
main();
