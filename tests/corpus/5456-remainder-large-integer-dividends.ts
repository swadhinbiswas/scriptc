// `%` with integer dividends beyond 2^53 (every double there is an integer)
// and integer divisors: constant, int32 and unproven. Results match Node,
// including the sign of zero and the bounds of the inline integer path at
// 2^62 and 2^63.

function show(label: string, v: number): void {
  console.log(label, Object.is(v, -0) ? "-0" : String(v));
}

const dividends: number[] = [
  2 ** 53, -(2 ** 53), 2 ** 53 + 2, -(2 ** 53 + 2), 2 ** 54 + 4, 2 ** 60 + 1024, -(2 ** 60 + 2048),
  2 ** 61 + 3 * 2 ** 9, 2 ** 62 - 1024, -(2 ** 62 - 1024), 2 ** 62, -(2 ** 62), 2 ** 62 + 1024,
  -(2 ** 62 + 1024), 2 ** 63 - 1024, -(2 ** 63 - 1024), 2 ** 63, -(2 ** 63), 2 ** 64, -(2 ** 64),
  1e19, -1e19, 1e21, 9.999999999999999e22,
];
const divisors: number[] = [
  1, -1, 2, 3, -3, 7, 10, 1000, 65535, 1000000007, 2147483647, -2147483647, 2 ** 31, 2 ** 32 - 1,
  2 ** 53 - 1, 2 ** 53 + 2, 2 ** 62, -(2 ** 62), 2 ** 62 + 1024, 2 ** 63, -(2 ** 63), 2 ** 64, 0,
  -0,
];

// Unproven dividends and divisors read from arrays.
let checksum = 0;
for (let i = 0; i < dividends.length; i++) {
  for (let j = 0; j < divisors.length; j++) {
    const r = dividends[i]! % divisors[j]!;
    show(`${dividends[i]} % ${divisors[j]}`, r);
    if (r === r) checksum = (checksum * 31 + (r % 1000003)) % 1000000007;
  }
}
show("checksum", checksum);

// Constant divisors.
for (const x of dividends) {
  show(`${x} % 3`, x % 3);
  show(`${x} % -10`, x % -10);
  show(`${x} % 1000000007`, x % 1000000007);
  show(`${x} % 2147483647`, x % 2147483647);
  show(`${x} % -1`, x % -1);
}

// Int32 divisors: loop counters and `| 0` values.
for (let k = 1; k <= 40; k += 13) {
  for (const x of dividends) {
    show(`${x} % ${k}`, x % k);
    const m = (k * 7919) | 0;
    show(`${x} % ${m}`, x % m);
    show(`${x} % ${-m}`, x % -m);
  }
}
