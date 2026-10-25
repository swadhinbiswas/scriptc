// Array index loops keep their counter in integer storage; every place the
// counter is observed as a number (arithmetic, comparisons, strings, calls,
// stores, nested starts) sees the exact double, including +0 at the start.

function take(n: number): string {
  return Object.is(n, -0) ? "-0" : `${n}`;
}

const words = ["alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta"];
const out: string[] = [];
for (let i = 0; i < words.length; i++) {
  out.push(`${i}:${i / 2}:${i * 1.5}:${i - 3}:${take(i)}:${i === words.length - 1}:${(i + 0.25).toFixed(2)}`);
}
console.log(out.join(" "));

// Nested `j = i + 1` loops and counters stored into number arrays and maps.
const pairs: number[] = [];
const weights = new Map<number, number>();
for (let i = 0; i < words.length; i++) {
  for (let j = i + 1; j < words.length; j++) {
    if ((i + j) % 3 === 0) pairs.push(i * 10 + j);
    weights.set(j, (weights.get(j) ?? 0) + i / (j + 1));
  }
}
console.log(pairs.join(","));
console.log([...weights].map(([k, v]) => `${k}=${v.toFixed(6)}`).join(" "));

// for-of with an index read back as a number and used as a key.
const seen: Record<string, number> = {};
let index = 0;
for (const w of words) {
  seen[w] = index * index - 0.5;
  index++;
}
console.log(JSON.stringify(seen));

// Counters passed to functions taking numbers, compared with fractions and
// negative values, and used to index a second array.
const values = words.map((w) => w.length);
let acc = 0;
for (let i = 0; i < values.length; i++) {
  acc += Math.max(i - 2.5, -1) * values[i]!;
  if (i > 2.5 && i < 4.5) acc += 1000;
  acc += Math.hypot(i, 1);
}
console.log(acc.toFixed(8));

// Arrays that grow during the loop (the bound is re-read every iteration).
const grow = [1, 2, 3];
for (let i = 0; i < grow.length; i++) {
  if (grow.length < 12) grow.push(i + grow[i]!);
}
console.log(grow.join(","));

// Byte loops: the index as a number in arithmetic and as an element value.
const bytes = new Uint8Array(20);
for (let i = 0; i < bytes.length; i++) bytes[i] = (i * 37) & 0xff;
let mix = 0;
for (let i = 0; i < bytes.length; i++) mix = (mix * 31 + bytes[i]! + i / 4) % 1000003;
console.log(Array.from(bytes).join(","), mix);

// A larger array so the counter passes 2^8 and 2^16 boundaries.
const big: number[] = [];
for (let i = 0; i < 70000; i++) big.push(i & 7);
let total = 0;
let last = -1;
for (let i = 0; i < big.length; i++) {
  if (big[i] === 7) {
    total += i;
    last = i;
  }
}
console.log(total, last, String(last / 3));
