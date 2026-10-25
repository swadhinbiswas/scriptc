// timingSafeEqual compares the bytes of any view or ArrayBuffer, checks
// buf1, buf2 and their byte lengths in Node's order, and throws Node's
// errors.
import { timingSafeEqual } from "node:crypto";

const show = (label, fn) => {
  try {
    console.log(label, fn());
  } catch (e) {
    console.log(label, "throws", e.name, e.code, e.message);
  }
};
const bytes = (...values) => new Uint8Array(values);

show("Uint8Array", () => timingSafeEqual(bytes(1, 2, 3), bytes(1, 2, 3)));
show("Uint8Array differs", () => timingSafeEqual(bytes(1, 2, 3), bytes(1, 2, 4)));
show("Buffer and Uint8Array", () => timingSafeEqual(Buffer.from("abc"), bytes(97, 98, 99)));
show("Uint16Array and Uint8Array", () => timingSafeEqual(new Uint16Array([0x0201, 0x0403]), bytes(1, 2, 3, 4)));
show("Int32Array and Float32Array", () => timingSafeEqual(new Int32Array([0]), new Float32Array([0])));
show("Float32Array -0 and 0", () => timingSafeEqual(new Float32Array([-0]), new Float32Array([0])));
show("Float64Array NaN", () => timingSafeEqual(new Float64Array([NaN]), new Float64Array([NaN])));
show("DataView and Buffer", () => timingSafeEqual(new DataView(bytes(9, 1, 2, 9).buffer, 1, 2), Buffer.from([1, 2])));
show("subarray", () => timingSafeEqual(bytes(7, 1, 2).subarray(1), bytes(1, 2)));
show("ArrayBuffer", () => timingSafeEqual(bytes(5, 6).buffer, bytes(5, 6)));
show("ArrayBuffer differs", () => timingSafeEqual(bytes(5, 6).buffer, bytes(6, 5).buffer));
show("SharedArrayBuffer", () => timingSafeEqual(new SharedArrayBuffer(4), new Uint32Array(1)));
show("empty", () => timingSafeEqual(new Uint8Array(0), new ArrayBuffer(0)));
show("long equal", () => timingSafeEqual(new Uint8Array(1000).fill(7), new Uint8Array(1000).fill(7)));
show("long differs at end", () => {
  const a = new Uint8Array(1000).fill(7);
  const b = new Uint8Array(1000).fill(7);
  b[999] = 8;
  return timingSafeEqual(a, b);
});

show("length mismatch", () => timingSafeEqual(bytes(1, 2), bytes(1, 2, 3)));
show("byte length mismatch", () => timingSafeEqual(new Uint16Array(1), bytes(0, 0, 0)));
show("string", () => timingSafeEqual("ab", "ab"));
show("number second", () => timingSafeEqual(bytes(1), 5));
show("null first", () => timingSafeEqual(null, bytes(1)));
show("array", () => timingSafeEqual([1], [1]));
show("object second", () => timingSafeEqual(bytes(1), {}));
show("bad first and short second", () => timingSafeEqual(5, bytes(1, 2)));
show("bad second and length", () => timingSafeEqual(bytes(1, 2), "x"));
show("one argument", () => timingSafeEqual(bytes(1)));
