// Widened records through recursive and nested calls: each level builds
// its argument from unchecked reads that run past the end of the input.
interface Span {
  lo: number;
  hi: number;
}
function extend(span: Span, values: number[], i: number): Span {
  if (i > values.length) return span;
  const next: Span = { lo: Math.min(span.lo ?? Infinity, values[i] ?? Infinity), hi: values[i + 1] };
  return extend(next, values, i + 1);
}
function size(span: Span): number {
  return (span.hi ?? span.lo ?? 0) - (span.lo ?? 0);
}
function even(span: Span, n: number): boolean {
  return n === 0 ? span.hi === undefined : odd({ lo: span.lo, hi: span.hi }, n - 1);
}
function odd(span: Span, n: number): boolean {
  return n === 0 ? span.hi !== undefined : even(span, n - 1);
}
const values = [7, 3, 9, 1];
const result = extend({ lo: values[0], hi: values[1] }, values, 0);
console.log(result.lo, result.hi, size(result), JSON.stringify(result));
console.log(size(extend({ lo: 2, hi: 5 }, values, 2)), even(result, 3), odd(result, 2));
for (let i = 0; i < 6; i++) console.log(size({ lo: values[i], hi: values[i + 2] }));
