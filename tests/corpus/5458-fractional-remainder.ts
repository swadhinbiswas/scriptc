// Fractional dividends with `%`: Weyl sequences and hashes reduced `% 1`,
// phases reduced by powers of two and by other divisors, and negative values
// whose remainders keep the dividend's sign.

function show(label: string, v: number): void {
  console.log(label, Object.is(v, -0) ? "-0" : String(v));
}

let weyl = 0.5;
let hashSum = 0;
for (let i = 0; i < 2000; i++) {
  weyl = (weyl + 0.6180339887498949) % 1;
  const h = (weyl * 2654435761.5) % 1;
  hashSum += h;
  if (i < 6) show(`weyl ${i}`, weyl);
  if (i < 6) show(`hash ${i}`, h);
}
show("hashSum", hashSum);

let phase = -3.75;
for (let i = 0; i < 12; i++) {
  phase = phase * -2.5 + 0.125;
  show(`phase ${i} % 4`, phase % 4);
  show(`phase ${i} % 0.25`, phase % 0.25);
  show(`phase ${i} % 360`, phase % 360);
  show(`phase ${i} % (2 * Math.PI)`, phase % (2 * Math.PI));
}

// Fractional parts of negative values and of values that are integers.
for (const x of [-2.5, -2, -0.5, -0, 0, 0.5, 2, 2.5, -1e-310, 1e-310, 4503599627370495.5]) {
  show(`${x} % 1`, x % 1);
  show(`${x} % -1`, x % -1);
  show(`${x} % 2`, x % 2);
}
