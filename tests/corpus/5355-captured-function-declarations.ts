// Nested function declarations captured by sibling functions keep their
// JavaScript identity and hoisting: calls through the capture reach the
// declared body, mutual recursion works across the hoisted pair, each call
// of the enclosing function creates fresh function objects, and a
// function binding that some code reassigns stays a shared binding.

function spectral(): number {
  const N = 5;
  function A(i: number, j: number): number {
    return 1.0 / (((i + j) * (i + j + 1)) / 2 + i + 1);
  }
  function mulAv(v: number[], out: number[]): void {
    for (let i = 0; i < N; i++) {
      let s = 0;
      for (let j = 0; j < N; j++) s += A(i, j) * v[j]!;
      out[i] = s;
    }
  }
  const u = [1, 1, 1, 1, 1];
  const t = [0, 0, 0, 0, 0];
  mulAv(u, t);
  mulAv(t, u);
  return u.reduce((a, b) => a + b, 0);
}
console.log("spectral", spectral().toFixed(9));

function parity(n: number): string {
  function isEven(k: number): boolean {
    return k === 0 ? true : isOdd(k - 1);
  }
  function isOdd(k: number): boolean {
    return k === 0 ? false : isEven(k - 1);
  }
  const check = (k: number): string => (isEven(k) ? "even" : "odd");
  return check(n) + "/" + check(n + 1);
}
console.log("parity", parity(10), parity(7));

function identity(): () => number {
  function inner(): number {
    return 42;
  }
  return inner;
}
const first = identity();
const second = identity();
console.log("identity", first === second, first === first, first(), second());

function reassigned(): string {
  let greet = (): string => "hello";
  const call = (): string => greet();
  const before = call();
  greet = (): string => "bye";
  return before + " " + call();
}
console.log("reassigned", reassigned());

function hoistedCall(): number {
  const total = sum(4);
  function sum(n: number): number {
    return n <= 0 ? 0 : n + helper(n - 1);
  }
  function helper(n: number): number {
    return sum(n);
  }
  return total + sum(3);
}
console.log("hoisted", hoistedCall());
