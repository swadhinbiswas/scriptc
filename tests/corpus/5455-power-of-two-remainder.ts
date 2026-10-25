// `%` by a constant power of two of at least 1 matches Node for every kind
// of dividend: integers, fractions, subnormals, values beyond 2^53, -0,
// NaN and the infinities. The divisor's sign does not change the result,
// and a zero result takes the dividend's sign.

function show(label: string, v: number): void {
  console.log(label, Object.is(v, -0) ? "-0" : String(v));
}

const dividends: number[] = [
  0, -0, 1, -1, 3, -4, 7.25, -7.25, 0.75, -0.75, 1.5, -1.5, 5e-324, -5e-324,
  2.2250738585072014e-308, -2.2250738585072014e-308, 1e-300, 2 ** 31 - 0.5, -(2 ** 31) + 0.5,
  2 ** 32 + 0.25, 2 ** 52 + 1, -(2 ** 52 + 3), 2 ** 52 + 0.5, 2 ** 53, -(2 ** 53), 2 ** 53 + 2,
  2 ** 60 + 1024, -(2 ** 60), 2 ** 63, 2 ** 64 + 4096, 1e21, -1e21, 1e300, -1e300,
  Number.MAX_VALUE, -Number.MAX_VALUE, 123456789.123, -98765.4321, NaN, Infinity, -Infinity,
];

for (const x of dividends) {
  show(`${x} % 1`, x % 1);
  show(`${x} % -1`, x % -1);
  show(`${x} % 2`, x % 2);
  show(`${x} % 8`, x % 8);
  show(`${x} % -16`, x % -16);
  show(`${x} % 1024`, x % 1024);
  show(`${x} % 2147483648`, x % 2147483648);
  show(`${x} % -2147483648`, x % -2147483648);
  show(`${x} % 4294967296`, x % 4294967296);
  show(`${x} % 2 ** 32`, x % 2 ** 32);
  show(`${x} % -(2 ** 40)`, x % -(2 ** 40));
  show(`${x} % 2 ** 52`, x % 2 ** 52);
  show(`${x} % 2 ** 53`, x % 2 ** 53);
  show(`${x} % 2 ** 64`, x % 2 ** 64);
  show(`${x} % 2 ** 1023`, x % 2 ** 1023);
  show(`${x} % -(2 ** 1023)`, x % -(2 ** 1023));
}

// Divisors that are not powers of two of at least 1 keep the general path.
for (const x of dividends) {
  show(`${x} % 0.5`, x % 0.5);
  show(`${x} % 0.125`, x % 0.125);
  show(`${x} % 3`, x % 3);
  show(`${x} % 6`, x % 6);
  show(`${x} % 2 ** 0.5`, x % 2 ** 0.5);
  show(`${x} % 2 ** -1`, x % 2 ** -1);
}

// Module constants, compound assignment, record fields and closures.
const WORD = 4294967296;
const HALF_WORD = 65536;
interface Cell {
  value: number;
}
const cell: Cell = { value: -12345.678 };
let total = 0;
for (let i = 0; i < 64; i++) {
  cell.value = cell.value * -3.7 + i;
  let v = cell.value;
  v %= HALF_WORD;
  total += (v % WORD) + (cell.value % 256);
}
show("total", total);
const wrap = (x: number): number => x % 2 ** 16;
show("wrap", wrap(-1e15 - 0.5) + wrap(2 ** 70) + wrap(65536.5));
let sum = 0;
for (let i = -20; i <= 20; i++) sum += (i * 0.37) % 1;
show("sum", sum);
