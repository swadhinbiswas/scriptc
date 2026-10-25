// Typed-array element reads compared with numbers and bound to locals:
// in-bounds and past-the-end indices, fractional and negative indices,
// every number typed-array kind, -0 and NaN elements, comparisons with
// values that may be undefined, and bindings observed with typeof.

function countEq(a: Uint8Array, b: number): number {
  let c = 0;
  for (let i = 0; i < a.length; i++) if (a[i] === b) c++;
  return c;
}

function countNe(a: Int16Array, b: number): number {
  let c = 0;
  for (let i = 0; i <= a.length; i++) if (a[i] !== b) c++;
  return c;
}

function eqAt(a: Float64Array, i: number, b: number): string {
  return `${a[i] === b}/${a[i] !== b}/${b === a[i]}/${b !== a[i]}`;
}

function eqOptional(a: Uint8Array, i: number, b: number | undefined): string {
  return `${a[i] === b}/${a[i] !== b}`;
}

function eqReads(a: Int32Array, i: number, b: Float32Array, j: number): string {
  return `${a[i] === b[j]}/${a[i] !== b[j]}`;
}

function lower(src: Uint8Array, dst: Uint8Array): void {
  const n = src.length;
  for (let i = 0; i < n; i++) {
    const c = src[i];
    dst[i] = c >= 65 && c <= 90 ? c | 32 : c;
  }
}

function lowerPast(src: Uint8Array, dst: Uint8Array): number {
  // The last pass reads past the end of `src`: undefined stores as 0.
  let stores = 0;
  for (let i = 0; i < dst.length; i++) {
    const c = src[i];
    dst[i] = c >= 65 && c <= 90 ? c | 32 : c;
    stores++;
  }
  return stores;
}

function bindingKinds(a: Float32Array, extra: number): string {
  const out: string[] = [];
  for (let i = 0; i < a.length; i++) {
    const v = a[i];
    out.push(`${typeof v}:${v}:${Object.is(v, -0)}`);
  }
  for (let i = a.length; i < a.length + extra; i++) {
    const v = a[i];
    out.push(`${typeof v}:${v}:${v === undefined}`);
  }
  return out.join(" ");
}

function show(value: unknown): string {
  return `${typeof value}(${String(value)})`;
}

function bindingEscapes(a: Int8Array, i: number): string {
  const v = a[i];
  return show(v);
}

function inBoundsEscapes(a: Uint32Array): string {
  const out: string[] = [];
  for (let i = 0; i < a.length; i++) {
    const v = a[i];
    out.push(show(v));
  }
  return out.join(",");
}

function scanI8(t: Int8Array, needle: number): string {
  let hits = 0;
  let misses = 0;
  for (let i = -1; i <= t.length; i += 0.5) {
    if (t[i] === needle) hits++;
    if (needle !== t[i]) misses++;
  }
  let typeofs = "";
  for (let i = 0; i < t.length + 1; i++) {
    const v = t[i];
    typeofs += typeof v === "number" ? "n" : "u";
  }
  for (let i = 0; i < t.length; i++) {
    const v = t[i];
    if (v === needle) typeofs += "=";
    if (Object.is(v, -0)) typeofs += "-0";
    if (v !== v) typeofs += "NaN";
  }
  return `${hits}/${misses}/${typeofs}`;
}

function scanU8(t: Uint8Array, needle: number): string {
  let hits = 0;
  let misses = 0;
  for (let i = -1; i <= t.length; i += 0.5) {
    if (t[i] === needle) hits++;
    if (needle !== t[i]) misses++;
  }
  let typeofs = "";
  for (let i = 0; i < t.length + 1; i++) {
    const v = t[i];
    typeofs += typeof v === "number" ? "n" : "u";
  }
  for (let i = 0; i < t.length; i++) {
    const v = t[i];
    if (v === needle) typeofs += "=";
    if (Object.is(v, -0)) typeofs += "-0";
    if (v !== v) typeofs += "NaN";
  }
  return `${hits}/${misses}/${typeofs}`;
}

function scanU8C(t: Uint8ClampedArray, needle: number): string {
  let hits = 0;
  let misses = 0;
  for (let i = -1; i <= t.length; i += 0.5) {
    if (t[i] === needle) hits++;
    if (needle !== t[i]) misses++;
  }
  let typeofs = "";
  for (let i = 0; i < t.length + 1; i++) {
    const v = t[i];
    typeofs += typeof v === "number" ? "n" : "u";
  }
  for (let i = 0; i < t.length; i++) {
    const v = t[i];
    if (v === needle) typeofs += "=";
    if (Object.is(v, -0)) typeofs += "-0";
    if (v !== v) typeofs += "NaN";
  }
  return `${hits}/${misses}/${typeofs}`;
}

function scanI16(t: Int16Array, needle: number): string {
  let hits = 0;
  let misses = 0;
  for (let i = -1; i <= t.length; i += 0.5) {
    if (t[i] === needle) hits++;
    if (needle !== t[i]) misses++;
  }
  let typeofs = "";
  for (let i = 0; i < t.length + 1; i++) {
    const v = t[i];
    typeofs += typeof v === "number" ? "n" : "u";
  }
  for (let i = 0; i < t.length; i++) {
    const v = t[i];
    if (v === needle) typeofs += "=";
    if (Object.is(v, -0)) typeofs += "-0";
    if (v !== v) typeofs += "NaN";
  }
  return `${hits}/${misses}/${typeofs}`;
}

function scanU16(t: Uint16Array, needle: number): string {
  let hits = 0;
  let misses = 0;
  for (let i = -1; i <= t.length; i += 0.5) {
    if (t[i] === needle) hits++;
    if (needle !== t[i]) misses++;
  }
  let typeofs = "";
  for (let i = 0; i < t.length + 1; i++) {
    const v = t[i];
    typeofs += typeof v === "number" ? "n" : "u";
  }
  for (let i = 0; i < t.length; i++) {
    const v = t[i];
    if (v === needle) typeofs += "=";
    if (Object.is(v, -0)) typeofs += "-0";
    if (v !== v) typeofs += "NaN";
  }
  return `${hits}/${misses}/${typeofs}`;
}

function scanI32(t: Int32Array, needle: number): string {
  let hits = 0;
  let misses = 0;
  for (let i = -1; i <= t.length; i += 0.5) {
    if (t[i] === needle) hits++;
    if (needle !== t[i]) misses++;
  }
  let typeofs = "";
  for (let i = 0; i < t.length + 1; i++) {
    const v = t[i];
    typeofs += typeof v === "number" ? "n" : "u";
  }
  for (let i = 0; i < t.length; i++) {
    const v = t[i];
    if (v === needle) typeofs += "=";
    if (Object.is(v, -0)) typeofs += "-0";
    if (v !== v) typeofs += "NaN";
  }
  return `${hits}/${misses}/${typeofs}`;
}

function scanU32(t: Uint32Array, needle: number): string {
  let hits = 0;
  let misses = 0;
  for (let i = -1; i <= t.length; i += 0.5) {
    if (t[i] === needle) hits++;
    if (needle !== t[i]) misses++;
  }
  let typeofs = "";
  for (let i = 0; i < t.length + 1; i++) {
    const v = t[i];
    typeofs += typeof v === "number" ? "n" : "u";
  }
  for (let i = 0; i < t.length; i++) {
    const v = t[i];
    if (v === needle) typeofs += "=";
    if (Object.is(v, -0)) typeofs += "-0";
    if (v !== v) typeofs += "NaN";
  }
  return `${hits}/${misses}/${typeofs}`;
}

function scanF32(t: Float32Array, needle: number): string {
  let hits = 0;
  let misses = 0;
  for (let i = -1; i <= t.length; i += 0.5) {
    if (t[i] === needle) hits++;
    if (needle !== t[i]) misses++;
  }
  let typeofs = "";
  for (let i = 0; i < t.length + 1; i++) {
    const v = t[i];
    typeofs += typeof v === "number" ? "n" : "u";
  }
  for (let i = 0; i < t.length; i++) {
    const v = t[i];
    if (v === needle) typeofs += "=";
    if (Object.is(v, -0)) typeofs += "-0";
    if (v !== v) typeofs += "NaN";
  }
  return `${hits}/${misses}/${typeofs}`;
}

function scanF64(t: Float64Array, needle: number): string {
  let hits = 0;
  let misses = 0;
  for (let i = -1; i <= t.length; i += 0.5) {
    if (t[i] === needle) hits++;
    if (needle !== t[i]) misses++;
  }
  let typeofs = "";
  for (let i = 0; i < t.length + 1; i++) {
    const v = t[i];
    typeofs += typeof v === "number" ? "n" : "u";
  }
  for (let i = 0; i < t.length; i++) {
    const v = t[i];
    if (v === needle) typeofs += "=";
    if (Object.is(v, -0)) typeofs += "-0";
    if (v !== v) typeofs += "NaN";
  }
  return `${hits}/${misses}/${typeofs}`;
}

const bytes = new Uint8Array([10, 97, 10, 0, 255, 10]);
console.log("countEq", countEq(bytes, 10), countEq(bytes, 0), countEq(bytes, 255), countEq(bytes, NaN));
console.log("countEq-0", countEq(bytes, -0), countEq(bytes, 10.5), countEq(bytes, 266));
console.log("countNe", countNe(new Int16Array([-1, 2, -1]), -1), countNe(new Int16Array(2), 0));

const floats = new Float64Array([0, -0, NaN, 1.5, Infinity]);
for (let i = -1; i < 7; i++) console.log("eqAt", i, eqAt(floats, i, 0), eqAt(floats, i, NaN));
console.log("eqAt-frac", eqAt(floats, 1.5, 0), eqAt(floats, 3, 1.5), eqAt(floats, 4, Infinity));
console.log("eqAt-neg0", eqAt(floats, 0, -0), eqAt(floats, 1, -0), eqAt(floats, 1, 0));

const optional: (number | undefined)[] = [undefined, 10, 97];
for (const b of optional) console.log("eqOptional", show(b), eqOptional(bytes, 1, b), eqOptional(bytes, 99, b));

const ints = new Int32Array([7, -7]);
const singles = new Float32Array([7, -7.5]);
for (const [i, j] of [
  [0, 0],
  [1, 1],
  [5, 0],
  [5, 9],
  [0.5, 0.5],
]) {
  console.log("eqReads", i, j, eqReads(ints, i!, singles, j!));
}

const src = new Uint8Array([72, 101, 76, 76, 79, 32, 90, 64, 91, 65]);
const dst = new Uint8Array(src.length);
lower(src, dst);
console.log("lower", Array.from(dst).join(","));
const wide = new Uint8Array(src.length + 3).fill(1);
console.log("lowerPast", lowerPast(src, wide), Array.from(wide).join(","));

console.log("bindingKinds", bindingKinds(new Float32Array([1.25, -0, NaN, 0]), 2));
for (const i of [0, 1, 2, -1, 0.5, 3]) console.log("bindingEscapes", i, bindingEscapes(new Int8Array([-128, 127, -0]), i));
console.log("inBoundsEscapes", inBoundsEscapes(new Uint32Array([0, 4294967295, 2147483648])));

const needles = [0, -0, 1, 255, NaN, -1, 4294967295];
const i8 = new Int8Array([-1, 0, 1, -128]);
console.log("Int8Array", needles.map((n) => scanI8(i8, n)).join(" "));
const u8 = new Uint8Array([255, 0, 1, 128]);
console.log("Uint8Array", needles.map((n) => scanU8(u8, n)).join(" "));
const u8c = new Uint8ClampedArray([300, -5, 1, 128]);
console.log("Uint8ClampedArray", needles.map((n) => scanU8C(u8c, n)).join(" "));
const i16 = new Int16Array([-1, 0, 1, -32768]);
console.log("Int16Array", needles.map((n) => scanI16(i16, n)).join(" "));
const u16 = new Uint16Array([65535, 0, 1, 128]);
console.log("Uint16Array", needles.map((n) => scanU16(u16, n)).join(" "));
const i32 = new Int32Array([-1, 0, 1, -2147483648]);
console.log("Int32Array", needles.map((n) => scanI32(i32, n)).join(" "));
const u32 = new Uint32Array([4294967295, 0, 1, 128]);
console.log("Uint32Array", needles.map((n) => scanU32(u32, n)).join(" "));
const f32 = new Float32Array([-1, -0, 1, NaN]);
console.log("Float32Array", needles.map((n) => scanF32(f32, n)).join(" "));
const f64 = new Float64Array([-1, -0, 1, NaN]);
console.log("Float64Array", needles.map((n) => scanF64(f64, n)).join(" "));
