// `%` by a constant power of two around the bounds of its integer path:
// dividends just inside and outside 2^62 in magnitude, large fractions,
// subnormals, divisors up to and past 2^52, computed dividends below and
// above twice the divisor, and loops whose dividends switch between
// integers, fractions, negatives, NaN and the infinities at the same
// remainder. Every zero result takes the dividend's sign.

function show(label: string, v: number): void {
  console.log(label, Object.is(v, -0) ? "-0" : String(v));
}

const dividends: number[] = [
  2 ** 62 - 1024, -(2 ** 62 - 1024), 2 ** 62, -(2 ** 62), 2 ** 62 + 1024, -(2 ** 62 + 2048),
  2 ** 61 + 512, -(2 ** 61 + 512), 2 ** 52 - 0.5, -(2 ** 52 - 0.5), 2 ** 51 + 0.25,
  -(2 ** 51 + 0.75), 4503599627370495.5, 0.9999999999999999, -0.9999999999999999, 1e-320, -1e-320,
  -0.5, 0.5, -65536, 65536, -65536.5, 131071.75, -131071.75, -0, 0,
];
const divided: Array<[string, (x: number) => number]> = [
  ["1", (x) => x % 1],
  ["2", (x) => x % 2],
  ["65536", (x) => x % 65536],
  ["-65536", (x) => x % -65536],
  ["2 ** 31", (x) => x % 2 ** 31],
  ["2 ** 51", (x) => x % 2 ** 51],
  ["2 ** 52", (x) => x % 2 ** 52],
  ["-(2 ** 52)", (x) => x % -(2 ** 52)],
  ["2 ** 53", (x) => x % 2 ** 53],
];
for (const x of dividends) {
  for (const [name, f] of divided) show(`${x} % ${name}`, f(x));
}

// One remainder site sees every kind of dividend in turn.
const stream: number[] = [];
for (let i = 0; i < 200; i++) {
  const k = i % 8;
  stream.push(
    k === 0
      ? i * 977
      : k === 1
        ? -i * 1013
        : k === 2
          ? i + 0.375
          : k === 3
            ? -i - 0.625
            : k === 4
              ? (i * 2 ** 40) / 3
              : k === 5
                ? -(2 ** 62) - i * 4096
                : k === 6
                  ? 2 ** 62 - 1024 * (i + 1)
                  : -0,
  );
}
stream.push(NaN, 5, Infinity, -7, -Infinity, 9);
let s = 0;
let t = 0;
for (let i = 0; i < stream.length; i++) {
  s = (s + stream[i]!) % 65536;
  t += stream[i]! % 1024;
  if (i % 25 === 0 || i >= stream.length - 6) {
    show(`s[${i}]`, s);
    show(`t[${i}]`, t);
  }
  if (Number.isNaN(s)) s = 0;
  if (Number.isNaN(t)) t = 0;
}

// Accumulators that stay integers, with negative and positive steps.
let up = 0;
let down = 0;
for (let i = 0; i < 100000; i++) {
  up = (up + i * 7919) % 65536;
  down = (down * 3 - i) % 2 ** 16;
}
show("up", up);
show("down", down);

// Fractional accumulators, which take the floating remainder.
let phase = 0;
let drift = 0;
for (let i = 0; i < 1000; i++) {
  phase = (phase + 0.1234567) % 1;
  drift = (drift - 2.75) % 256;
}
show("phase", phase);
show("drift", drift);

// Computed dividends around one and two divisors, of both signs.
const half = [0.25][0]!;
const near: number[] = [
  0.25, 255.5, 255.75 - 2 ** -44, 256, 511.5, 511.75 - 2 ** -44, 512, 767.25, 1023.5, 2 ** 40 + 0.5,
];
for (const v of near) {
  for (const x of [v, -v]) show(`(${x} + 0.25) % 256`, (x + half) % 256);
}

// Proven integer dividends with a `2 ** k` divisor; negative multiples are -0.
for (let i = -6; i <= 6; i++) show(`(${i} * 4) % 2 ** 4`, (i * 4) % 2 ** 4);
for (let i = -6; i <= 6; i++) show(`(${i} * 3) % 2 ** 3`, (i * 3) % 2 ** 3);
