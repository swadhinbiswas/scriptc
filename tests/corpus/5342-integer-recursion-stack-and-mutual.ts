// Pure integer recursion that overflows the stack, never ends, recurses
// mutually, takes and returns booleans, or nests calls in its arguments.

// Non-tail recursion with an int32 result: infinite for negative input.
function down(n: number): number {
  if (n === 0) return 0;
  return down(n - 1) | 0;
}

// An accumulating self call that never reaches its base case.
function spin(n: number): number {
  if (n === 1) return 0;
  return spin(n + 0) + 1;
}

// An accumulating chain: deep or endless input overflows the stack even
// though the recursion runs as a loop.
function count(n: number): number {
  return n === 0 ? 0 : 1 + count(n - 1);
}

// Plain mutual tail calls (kept within Node's stack depth: compiled code
// runs them as a loop, so an endless chain would not overflow).
function isEven(n: number): boolean {
  return n === 0 ? true : isOdd(n - 1);
}
function isOdd(n: number): boolean {
  return n === 0 ? false : isEven(n - 1);
}

function ping(n: number): number {
  return n <= 0 ? 1 : pong(n - 1) + n;
}
function pong(n: number): number {
  return n <= 0 ? 2 : ping(n - 2) * 2;
}

function alternate(flag: boolean, n: number): number {
  if (n === 0) return 0;
  const step = flag ? 1 : 1000000000;
  return step + alternate(!flag, n - 1);
}

function ack(m: number, n: number): number {
  if (m === 0) return n + 1;
  if (n === 0) return ack(m - 1, 1);
  return ack(m - 1, ack(m, n - 1));
}

function tak(x: number, y: number, z: number): number {
  return y < x ? tak(tak(x - 1, y, z), tak(y - 1, z, x), tak(z - 1, x, y)) : z;
}

function attempt(label: string, run: () => number | boolean): void {
  try {
    console.log(label, run());
  } catch (e) {
    console.log(label, e instanceof RangeError, (e as Error).message);
  }
}

attempt("down 1000", () => down(1000));
attempt("down -1", () => down(-1));
attempt("down 10 after overflow", () => down(10));
attempt("spin", () => spin(2));
attempt("count 3000", () => count(3000));
attempt("count -1", () => count(-1));
attempt("count 1e7", () => count(1e7));
attempt("count 5 after overflow", () => count(5));
attempt("isEven 7", () => isEven(7));
attempt("isOdd 7", () => isOdd(7));
attempt("isEven 1001", () => isEven(1001));
for (const n of [0, 1, 5, 20, 40, 60, 61, 62, 100]) attempt(`ping ${n}`, () => ping(n));
for (const n of [0, 1, 2, 3, 4, 5, 6, 7]) attempt(`alternate ${n}`, () => alternate(true, n));
attempt("ack 2 3", () => ack(2, 3));
attempt("ack 3 5", () => ack(3, 5));
attempt("tak 18 12 6", () => tak(18, 12, 6));
attempt("tak 12.5 6 0", () => tak(12.5, 6, 0));
let total = 0;
for (let i = 0; i < 4; i++) total += tak(12 + i, 8, 4) + ack(2, i);
console.log(total);
