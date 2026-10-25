// Class instances with scalar-union fields: optional and nullable numbers,
// booleans, inherited fields, accessors, and fields that start undefined.
class Counter {
  count: number | undefined;
  limit?: number;
  done: boolean | null = null;
  constructor(limit?: number) {
    if (limit !== undefined) this.limit = limit;
  }
  bump(): number {
    this.count = (this.count ?? 0) + 1;
    if (this.limit !== undefined && this.count >= this.limit) this.done = true;
    return this.count;
  }
  get remaining(): number | undefined {
    return this.limit === undefined ? undefined : this.limit - (this.count ?? 0);
  }
}

class Timed extends Counter {
  started: number | null = null;
  constructor(limit: number | undefined, at: number) {
    super(limit);
    this.started = at > 0 ? at : null;
  }
  override bump(): number {
    const n = super.bump();
    if (this.started !== null) this.started = this.started + n;
    return n;
  }
}

class Cell {
  value: number | boolean | undefined;
  constructor(value: number | boolean | undefined) {
    this.value = value;
  }
}
const counters: Counter[] = [new Counter(), new Counter(2), new Timed(3, 10), new Timed(undefined, 0)];
for (let round = 0; round < 3; round++) {
  for (const c of counters) c.bump();
  console.log(counters.map((c) => `${c.count}/${c.limit}/${c.done}/${c.remaining}`).join(" "));
}
for (const c of counters) console.log(c.count, c.limit, c.done, c instanceof Timed ? c.started : "-");
const plain = new Cell(5);
console.log(plain, Object.keys(plain), plain.value);

const cells = [new Cell(1), new Cell(true), new Cell(undefined), new Cell(-0)];
const copies = cells.map((c) => new Cell(c.value));
copies[0]!.value = 99;
console.log(cells, copies, cells.map((c) => typeof c.value).join(","));
const total = cells.reduce((sum, c) => sum + (typeof c.value === "number" ? c.value : 0), 0);
console.log(total, Object.is(cells[3]!.value, -0));

let hot = 0;
const one = new Counter(1000000);
for (let i = 0; i < 2000; i++) hot += one.bump() + (one.remaining ?? 0);
console.log(hot, one.done);
