// `x | 0` and the other identity bitwise forms. Operands the range analysis
// proves int32 (uint32 for `>>>`) come back unchanged; every other operand
// takes the exact ToInt32/ToUint32: signed zero, NaN, infinities, fractions
// and the 2^31, 2^32 and 2^53 boundaries.
function show(label: string, value: number): void {
  console.log(label, value, Object.is(value, -0) ? "negative zero" : "", 1 / value);
}

const inputs = [
  0, -0, 0.5, -0.5, 1.5, -1.5, 0.9999999999999999, NaN, Infinity, -Infinity, 2147483647,
  2147483648, 2147483649, -2147483647, -2147483648, -2147483649, 4294967295, 4294967296,
  4294967297, -4294967296, 9007199254740991, 9007199254740992, -9007199254740992,
  18014398509481988, 1e21, -1e21, 5e-324,
];

function convert(x: number): void {
  show("or", x | 0);
  show("zero-or", 0 | x);
  show("xor", x ^ 0);
  show("and", x & -1);
  show("and-u32", x & 4294967295);
  show("shl", x << 0);
  show("sar", x >> 0);
  show("shr", x >>> 0);
  show("sar32", x >> 32);
  show("or-2^32", x | 4294967296);
  show("xor-nan", x ^ NaN);
}

function proven(text: string, n: number): void {
  const length = text.length;
  show("length|0", length | 0);
  show("length>>>0", length >>> 0);
  show("zero-or-length", 0 | length);
  const masked = n & 0xff;
  show("masked|0", masked | 0);
  show("masked^0+1", (masked ^ 0) + 1);
  show("masked<<23", masked << 23);
  show("masked<<24", masked << 24);
  show("~masked", ~masked);
  show("~masked>>>0", ~masked >>> 0);
  const half = length >> 1;
  show("half%3", half % 3);
  show("ushr%7", (n >>> 1) % 7);
  const negative = -(length + 1);
  show("negative|0", negative | 0);
  show("negative>>>0", negative >>> 0);
  show("negative>>3", negative >> 3);
  show("negative-zero|0", -length | 0);
  show("product-zero|0", masked * -1);
  show("sum", (masked + length) | 0);
  const wide = length * 4294967296;
  show("wide|0", wide | 0);
  show("wide>>>0", wide >>> 0);
  show("or-pair", (masked | (length & 3)) | 0);
  let acc = 0;
  for (let i = 0; i < length; i++) acc = (acc * 31 + text.charCodeAt(i)) | 0;
  show("acc", acc);
  for (let f = 0.5; f < 3; f++) show("fraction-counter", f | 0);
}

for (const x of inputs) {
  console.log("input", x);
  convert(x);
}
for (const text of ["", "a", "hello, world", "a much longer piece of text to hash"])
  for (const n of [0, -1, 255, 256, -256, 2147483647, -2147483648, 4294967295, 0.5, NaN])
    proven(text, n);
