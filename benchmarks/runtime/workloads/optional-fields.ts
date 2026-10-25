// Records and class instances with `number | undefined` and other
// scalar-union fields: windows over unchecked array reads, sparse rows
// with optional scores, and stateful objects whose fields start unset.
interface Window {
  prev: number | undefined;
  next: number | undefined;
}
function windowAt(values: number[], i: number): Window {
  return { prev: values[i - 1], next: values[i + 1] };
}
function smooth(values: number[], rounds: number): number {
  let total = 0;
  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < values.length; i++) {
      const w = windowAt(values, i);
      const here = values[i]!;
      total += ((w.prev ?? here) + here + (w.next ?? here)) / 3;
    }
  }
  return total;
}

interface Row {
  id: number;
  score?: number;
  weight: number | null;
  flagged: boolean | undefined;
}
function rows(count: number): Row[] {
  const out: Row[] = [];
  for (let i = 0; i < count; i++) {
    const row: Row = { id: i, weight: i % 7 === 0 ? null : (i % 13) / 4, flagged: undefined };
    if (i % 3 !== 0) row.score = (i * 37) % 101;
    if (i % 5 === 0) row.flagged = i % 10 === 0;
    out.push(row);
  }
  return out;
}
function rank(list: Row[]): number {
  const scored = list.filter((r) => r.score !== undefined);
  scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.id - b.id);
  let sum = 0;
  for (let i = 0; i < scored.length; i++) {
    const r = scored[i]!;
    sum += (r.score ?? 0) * (r.weight ?? 1) + (r.flagged === true ? 1 : 0);
  }
  return sum;
}

class Tracker {
  low: number | undefined;
  high: number | undefined;
  last: number | null = null;
  seen = 0;
  observe(x: number): void {
    if (this.low === undefined || x < this.low) this.low = x;
    if (this.high === undefined || x > this.high) this.high = x;
    this.last = this.last === null ? x : (this.last + x) / 2;
    this.seen++;
  }
  span(): number {
    return this.low === undefined || this.high === undefined ? 0 : this.high - this.low;
  }
}
function track(values: number[], rounds: number): number {
  let total = 0;
  for (let r = 0; r < rounds; r++) {
    const t = new Tracker();
    for (let i = r % 3; i < values.length; i += 3) t.observe(values[i]!);
    total += t.span() + (t.last ?? 0);
  }
  return total;
}

const scale = Number(process.argv[2] ?? "1");
const values: number[] = [];
for (let i = 0; i < 4096; i++) values.push(((i * 7919) % 1000) / 10);
const smoothed = smooth(values, Math.floor(400 * scale));
let ranked = 0;
for (let k = 0; k < Math.floor(20 * scale); k++) ranked += rank(rows(20000 + k));
const tracked = track(values, Math.floor(400 * scale));
const sample = rows(8)
  .map((r) => `${r.id}:${r.score}:${r.weight}:${r.flagged}`)
  .join(" ");
console.log("smooth", smoothed.toFixed(4), "rank", ranked.toFixed(4), "track", tracked.toFixed(4));
console.log(sample);
