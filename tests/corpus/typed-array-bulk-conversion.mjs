const constructors = [Uint8Array, Uint8ClampedArray, Int8Array, Uint16Array, Int16Array, Uint32Array, Int32Array, Float32Array, Float64Array];
const values = [-Infinity, -1e100, -4294967297, -2147483649, -65537, -129, -1.5, -0, 0, 0.5, 1.5, 2.5, 127, 128, 254.5, 255, 256, 65535, 65536, 2147483648, 4294967295, 4294967296, 1e100, Infinity, NaN];
function show(array) {
  return Array.from(array, value => Object.is(value, -0) ? '-0' : String(value)).join(',');
}
for (const Source of constructors) {
  const source = new Source(259);
  for (let i = 0; i < source.length; i++) source[i] = values[i % values.length];
  for (const Target of constructors) {
    const copy = new Target(source);
    const target = new Target(265);
    target.fill(-3.5);
    target.set(source, 3);
    console.log(Source.name, Target.name, show(copy), show(target));
  }
}
for (const C of constructors) {
  for (const value of values) {
    const target = new C(133);
    target.fill(7);
    console.log(C.name, Object.is(value, -0) ? '-0' : String(value), target.fill(value, -130.5, 132.9) === target, show(target));
    target.fill(value, Infinity, -Infinity);
    console.log(show(target.subarray(0, 4)));
  }
}
// Different element widths may overlap before, at, or after the source.
for (const Source of constructors) {
  for (const Target of constructors) {
    for (const offset of [0, 8, 24]) {
      const buffer = new ArrayBuffer(4096);
      const source = new Source(buffer, 16, 140);
      for (let i = 0; i < source.length; i++) source[i] = i * 3 + 1;
      const target = new Target(buffer, offset, 145);
      target.set(source, 2);
      console.log(Source.name, Target.name, offset, show(target));
    }
  }
}
const empty = new Uint16Array(0);
console.log(new Float32Array(empty).length);
const unchanged = new Uint8Array([1, 2, 3]);
for (const offset of [-1, Infinity, 4]) {
  try { unchanged.set(empty, offset); } catch (error) { console.log(error.name, error.message); }
}
console.log(show(unchanged));
