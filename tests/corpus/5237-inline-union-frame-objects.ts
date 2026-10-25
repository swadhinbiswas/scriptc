// Records and class instances with scalar-union fields that never leave
// their frame: fields the constructor leaves unset read as undefined,
// arguments from unchecked reads and field reads arrive intact, methods
// update instances in place, and instances that escape keep their values.
class Probe {
  x: number | undefined;
  y: number | undefined;
  hit: boolean | undefined;
  note: number | null = null;
  constructor(x: number | undefined, y: number | undefined) {
    this.x = x;
    if (y !== undefined && y > 2) this.y = y;
  }
}
interface Pair {
  lo: number | undefined;
  hi: number | undefined;
}

const data = [1, 5, 2, 8, 3];
let total = 0;
let unset = 0;
for (let r = 0; r < 2; r++) {
  for (let i = 0; i < data.length; i++) {
    const pair: Pair = { lo: data[i], hi: data[i + 2] };
    const probe = new Probe(pair.lo, pair.hi);
    total += (probe.x ?? 0) + (probe.y ?? 100) + (probe.note ?? 7);
    if (probe.hit === undefined) unset++;
    if (probe.y === undefined) unset++;
  }
}
console.log(total, unset);

const kept: Probe[] = [];
for (let i = 0; i < data.length; i++) {
  const p = new Probe(data[i + 3], data[i]);
  if (i % 2 === 0) kept.push(p);
}
console.log(kept.map((p) => `${p.x}/${p.y}/${p.hit}/${p.note}`).join(" "));
kept[0]!.hit = true;
kept[0]!.note = 4;
console.log(kept[0]!.hit, kept[0]!.note, kept[1]!.hit);

// An instance that methods update in place still never leaves its frame.
class Range {
  lo: number | undefined;
  hi: number | undefined;
  count: number | null = null;
  add(x: number | undefined): void {
    if (x === undefined) return;
    if (this.lo === undefined || x < this.lo) this.lo = x;
    if (this.hi === undefined || x > this.hi) this.hi = x;
    this.count = (this.count ?? 0) + 1;
  }
}
let spans = 0;
for (let r = 0; r < 4; r++) {
  const range = new Range();
  for (let i = r; i < data.length + 2; i += 2) range.add(data[i]);
  spans += (range.hi ?? 0) - (range.lo ?? 0) + (range.count ?? 0);
  console.log(r, range.lo, range.hi, range.count);
}
console.log(spans);
