// Functions that return fresh number records or objects on every path,
// including early returns in loops and conditional results, give the same
// values whether their result is only read or kept.
interface Pair {
  a: number;
  b: number;
}
class Money {
  cents: number;
  constructor(cents: number) {
    this.cents = cents;
  }
  plus(o: Money): Money {
    return new Money(this.cents + o.cents);
  }
  scaled(k: number): Money {
    return new Money(Math.round(this.cents * k));
  }
}
function pair(a: number, b: number): Pair {
  return { a, b };
}
function swap(p: Pair): Pair {
  return { a: p.b, b: p.a };
}
function pick(n: number): Pair {
  if (n > 4) return { a: n, b: -n };
  for (let i = 0; i < 3; i++) if (i === n) return { a: i, b: i * i };
  return n < 0 ? { a: 0, b: 0 } : { a: 1, b: 1 };
}
function risky(n: number): Pair {
  if (n === 2) throw new Error(`risky ${n}`);
  return { a: n, b: n + 0.5 };
}
function sum(p: Pair): number {
  return p.a + p.b;
}
function countdown(n: number): Pair {
  return n === 0 ? { a: 0, b: 0 } : { a: sum(countdown(n - 1)) + n, b: n };
}
const kept: Pair[] = [];
let total = 0;
for (let i = -1; i < 7; i++) {
  total += sum(swap(pair(i, 2 * i))) + sum(pick(i));
  const p = pick(i);
  total += p.a * 3 + p.b;
  kept.push(pick(i));
  try {
    total += sum(risky(i));
  } catch (error) {
    console.log((error as Error).message);
  }
  const m = new Money(100 + i).plus(new Money(5)).scaled(1.5);
  total += m.cents;
  total += sum(countdown(i < 0 ? 0 : i));
}
console.log(total, kept.map((p) => `${p.a},${p.b}`).join(" "));
