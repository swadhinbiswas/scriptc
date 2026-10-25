// Whole-program parameter and result facts narrow from their int32 levels
// to the values actually passed and returned, once every write is shown to
// stay inside the narrowed ranges. A divisor known to be positive lets
// `(h * 33 + i) % m` stay an integer; a zero, negative, fractional or
// unknown divisor anywhere must keep JavaScript's remainder.

function hash(n: number, m: number): number {
  let h: number = 5381;
  for (let i: number = 0; i < n; i++) h = (h * 33 + i) % m;
  return h;
}
console.log("hash", hash(100000, 1000003), hash(5000, 65521));

// The fed-back result narrows the parameter it is passed to.
function step(x: number, n: number): number {
  return (x * 31 + n) % 1000003;
}
function run(times: number): number {
  let v: number = 1;
  for (let i: number = 0; i < times; i++) v = step(v, i % 1000);
  return v;
}
console.log("step", run(20000), step(1000002, 999));

// A zero divisor at one call site: NaN, never an integer remainder.
function mod0(n: number, m: number): number {
  let h: number = 7;
  for (let i: number = 0; i < n; i++) h = (h * 33 + i) % m;
  return h;
}
console.log("zero", mod0(10, 97), mod0(3, 0));

// A negative divisor: the sign follows the dividend.
function modNeg(n: number, m: number): number {
  let h: number = 11;
  for (let i: number = 0; i < n; i++) h = (h * 7 + i) % m;
  return h;
}
console.log("negative", modNeg(50, -13), modNeg(50, 13));

// A fractional divisor.
function modFrac(n: number, m: number): number {
  let h: number = 3;
  for (let i: number = 0; i < n; i++) h = (h * 5 + i) % m;
  return h;
}
console.log("fraction", modFrac(20, 2.5), modFrac(20, 9));

// A divisor from outside the program.
function hashDynamic(n: number, m: number): number {
  let h: number = 5381;
  for (let i: number = 0; i < n; i++) h = (h * 33 + i) % m;
  return h;
}
const dynamic: number = Number(process.argv.length > 99 ? "0" : "97");
console.log("dynamic", hashDynamic(1000, dynamic));

// A dividend that may be negative: -0 survives.
function signedRem(a: number, b: number): number {
  return (a - b) % 5;
}
const negZero: number = signedRem(5, 10);
console.log("signed", signedRem(9, 2), negZero, Object.is(negZero, -0));

// Doubling recursion: the narrowed range must cover every recursive call.
function grow(x: number): number {
  return x < 100 ? grow(x * 2 + 1) : x;
}
console.log("grow", grow(0), grow(3), grow(99));

// Counting down to the bottom of the range.
function down(d: number, acc: number): number {
  return d === 0 ? acc : down(d - 1, (acc * 3 + d) % 10007);
}
console.log("down", down(500, 1), down(0, 5));

// Mutual recursion passing results back and forth.
function ping(x: number, k: number): number {
  return k === 0 ? x : pong((x * 17 + k) % 4093, k - 1);
}
function pong(x: number, k: number): number {
  return k === 0 ? x : ping((x * 13 + 1) % 8191, k - 1);
}
console.log("pingpong", ping(1, 200), pong(4092, 3));

// A result range that grows past int32 when an argument does.
function triple(x: number): number {
  return x * 3;
}
console.log("triple", triple(5), triple(1000000000), triple(2147483647));
