// Module-level numbers that only the file's top-level code reads and writes
// keep an int32 local inside the initializer when every write is a proven
// int32. Values that may leave int32, become -0, NaN or fractional, or are
// observed by other functions keep their double global.

function step(x: number, n: number): number {
  return (x * 31 + n) % 1000003;
}

// A loop-carried call result.
let v: number = 1;
for (let r: number = 0; r < 3; r++) {
  for (let n: number = 0; n < 1000; n++) v = step(v, n);
}
console.log("call", v);

// An inline remainder with a module-level divisor.
const m: number = 65521;
let h: number = 5381;
for (let i: number = 0; i < 5000; i++) h = (h * 33 + i) % m;
console.log("inline", h);

// A uint32 hash.
let crc: number = 0xffffffff;
for (let i: number = 0; i < 300; i++) crc = ((crc >>> 1) ^ (i * 2654435761)) >>> 0;
console.log("uint32", crc, crc > 2147483647);

// Exits, labeled jumps and a nested block.
let found: number = -1;
outer: for (let i: number = 0; i < 100; i++) {
  for (let j: number = 0; j < 100; j++) {
    if ((i * j) % 97 === 96) {
      found = i * 100 + j;
      break outer;
    }
    if (j > i) continue outer;
  }
}
console.log("labeled", found);

// A counter written with ++ and --.
let ticks: number = 0;
for (let i: number = 0; i < 50; i++) {
  ticks++;
  if (i % 3 === 0) ticks--;
}
console.log("incdec", ticks);

// Stays double: growth past int32 and past 2^53.
let grow: number = 1;
for (let i: number = 0; i < 40; i++) grow = grow * 3 + 1;
console.log("grow", grow, Number.isSafeInteger(grow));

// Stays double: a signed remainder that reaches -0.
let signed: number = 5;
for (let i: number = 0; i < 6; i++) signed = (signed * 3 - 15) % 5;
console.log("signed", signed, Object.is(signed, -0), 1 / signed);

// Stays double: a fraction, then NaN.
let frac: number = 7;
for (let i: number = 0; i < 3; i++) frac = frac / 2;
let nan: number = 3;
for (let i: number = 0; i < 2; i++) nan = nan % 0;
console.log("frac", frac, "nan", nan);

// Stays a global: another function reads it.
let shared: number = 0;
function readShared(): number {
  return shared * 2;
}
for (let i: number = 0; i < 10; i++) shared = (shared + i) % 7;
console.log("shared", shared, readShared());

// Stays a global: a closure captures it.
let captured: number = 1;
const bump = (): void => {
  captured = (captured * 5) % 11;
};
for (let i: number = 0; i < 4; i++) bump();
console.log("captured", captured);

// Read before the loop writes it again, and after it.
let late: number = 2;
const before: number = late;
for (let i: number = 0; i < 9; i++) late = (late * late) % 1009;
console.log("late", before, late);
