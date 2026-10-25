// NoThrow contracts that do not hold: each diagnostic names the path from
// the annotated function to the operation that can throw.
import type { NoThrow } from "@scriptc/types";

function parseDigit(ch: string): number {
  const code = ch.charCodeAt(0) - 48;
  if (code < 0 || code > 9) throw new RangeError(`not a digit: ${ch}`);
  return code;
}

function sumDigits(text: string): NoThrow<number> {
  let sum = 0;
  for (let i = 0; i < text.length; i++) sum += parseDigit(text[i]!);
  return sum;
}

function depth(n: number): NoThrow<number> {
  return n <= 0 ? 0 : 1 + depth(n - 1);
}

function apply(f: (x: number) => number, x: number): NoThrow<number> {
  return f(x);
}

// The source type says `string`, but a caller passes a non-null asserted
// element that can be missing; Node then throws inside the callee, so the
// parameter is compiled as `string | undefined` and the read can throw.
function width(text: string): NoThrow<number> {
  return text.length;
}

const words = "a b".split(" ");
console.log(sumDigits("123"), depth(3), apply((x) => x + 1, 1), apply((x) => parseDigit(String(x)), 2));
console.log(width(words[0]!), width(words[1]!));
