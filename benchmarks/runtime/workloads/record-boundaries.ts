// Records built from unchecked array reads that cross annotated function
// boundaries: points returned from a lookup and passed to a metric,
// samples defaulted through `??` inside the callee, and a span grown by
// a recursive helper. Every read here finds its element.
interface Point {
  x: number;
  y: number;
}
function pointAt(xs: number[], ys: number[], i: number): Point {
  return { x: xs[i], y: ys[i] };
}
function distance(p: Point, q: Point): number {
  const dx = p.x - q.x;
  const dy = p.y - q.y;
  return Math.sqrt(dx * dx + dy * dy);
}
function pathLength(xs: number[], ys: number[], rounds: number): number {
  let total = 0;
  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i + 1 < xs.length; i++) total += distance(pointAt(xs, ys, i), pointAt(xs, ys, i + 1));
  }
  return total;
}

interface Sample {
  value: number;
  weight: number;
}
function weighted(s: Sample): number {
  return (s.value ?? 0) * (s.weight ?? 1);
}
function blend(a: Sample, b: Sample): Sample {
  return { value: (a.value + b.value) / 2, weight: a.weight + b.weight };
}
function mix(values: number[], weights: number[], rounds: number): number {
  let total = 0;
  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i + 1 < values.length; i++) {
      const s = blend({ value: values[i], weight: weights[i] }, { value: values[i + 1], weight: weights[i + 1] });
      total += weighted(s);
    }
  }
  return total;
}

interface Span {
  lo: number;
  hi: number;
}
function widen(span: Span, values: number[], from: number, to: number): Span {
  if (from >= to) return span;
  const v = values[from];
  return widen({ lo: Math.min(span.lo, v), hi: Math.max(span.hi, v) }, values, from + 1, to);
}
function spans(values: number[], rounds: number): number {
  let total = 0;
  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i + 16 <= values.length; i += 16) {
      const s = widen({ lo: values[i], hi: values[i] }, values, i + 1, i + 16);
      total += s.hi - s.lo;
    }
  }
  return total;
}

const scale = Number(process.argv[2] ?? "1");
const xs: number[] = [];
const ys: number[] = [];
const weights: number[] = [];
for (let i = 0; i < 4096; i++) {
  xs.push((i * 37) % 101);
  ys.push((i * 53) % 97);
  weights.push(((i * 7) % 11) / 4);
}
const path = pathLength(xs, ys, Math.floor(300 * scale));
const mixed = mix(xs, weights, Math.floor(300 * scale));
const spanned = spans(ys, Math.floor(300 * scale));
console.log("path", path.toFixed(3), "mix", mixed.toFixed(3), "spans", spanned.toFixed(3));
