// Small objects and records whose number and boolean fields are updated
// through methods, parameters and compound assignments: every update is
// visible to later reads, aliases see the same object, and updates made
// before an object escapes are kept.
class Stats {
  n = 0;
  sum = 0;
  max = -Infinity;
  seen = false;
  add(v: number): void {
    this.n++;
    this.sum += v;
    if (v > this.max) this.max = v;
    this.seen = true;
  }
  mean(): number {
    return this.n === 0 ? 0 : this.sum / this.n;
  }
  merge(other: Stats): void {
    this.n += other.n;
    this.sum += other.sum;
    if (other.max > this.max) this.max = other.max;
  }
}
interface Cursor {
  pos: number;
  done: boolean;
}
function advance(c: Cursor, by: number): void {
  c.pos += by;
  if (c.pos >= 10) c.done = true;
}
function both(a: Cursor, b: Cursor): number {
  a.pos += 1;
  b.pos *= 2;
  return a.pos + b.pos;
}
const kept: Stats[] = [];

let out = "";
for (let k = 0; k < 4; k++) {
  const s = new Stats();
  for (let i = 0; i < 6; i++) s.add(((k * 7 + i * 3) % 11) - 2);
  const t = new Stats();
  t.add(k * 10);
  s.merge(t);
  out += `${s.n}:${s.mean().toFixed(3)}:${s.max}:${s.seen} `;
  const c: Cursor = { pos: k, done: false };
  while (!c.done) advance(c, 3);
  const d: Cursor = { pos: 1, done: false };
  out += `${c.pos},${c.done},${both(d, d)},${d.pos} `;
  const late = new Stats();
  late.add(k);
  late.add(k + 1);
  if (k % 2 === 0) kept.push(late);
  try {
    const e = new Stats();
    e.add(5);
    if (k === 1) throw new Error("stop");
    e.add(6);
    out += `${e.sum} `;
  } catch (error) {
    out += `${(error as Error).message} `;
  }
}
console.log(out);
console.log(kept.map((s) => `${s.n}/${s.sum}`).join(" "));
