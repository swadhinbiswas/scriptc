const values: number[] = [NaN, -Infinity, Infinity, -0, -4294967297, -1.5, 0.5, 1.5, 2.5, 255.5, 65537, 4294967295];
values.length = 132;
values[128] = -123.5;
values[131] = 42;
console.log(Array.from(new Uint8ClampedArray(values)).join(','));
console.log(Array.from(new Int16Array(values)).join(','));
console.log(Array.from(new Float32Array(values)).map(value => Object.is(value, -0) ? '-0' : String(value)).join(','));
const sparse: number[] = [3];
sparse[4097] = 7;
const copied = new Float64Array(sparse);
console.log(copied.length, copied[0], copied[1], copied[4096], copied[4097]);
// Integer coercion must also agree at scalar bitwise call sites.
for (let exponent = 0; exponent < 2100; exponent += 7) {
  const magnitude = Math.pow(2, exponent - 1074);
  for (const factor of [-1.5, -1, 1, 1.5]) {
    const value = magnitude * factor;
    const packed = new Uint32Array([value]);
    console.log(value, value >>> 0, value | 0, packed[0]);
  }
}
