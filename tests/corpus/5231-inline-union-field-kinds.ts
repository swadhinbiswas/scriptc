// Every scalar-union field kind: numbers with undefined or null, booleans,
// mixed number and boolean arms, and three-armed unions. Reads, writes,
// comparisons and arithmetic behave as in Node.
interface Cell {
  n: number | null;
  b: boolean | undefined;
  m: number | boolean;
  t: number | null | undefined;
}

function cell(i: number): Cell {
  return {
    n: i % 3 === 0 ? null : i * 1.25,
    b: i % 2 === 0 ? i % 4 === 0 : undefined,
    m: i % 5 === 0 ? i > 4 : -i,
    t: i % 4 === 0 ? undefined : i % 4 === 1 ? null : i / 2,
  };
}

function kind(v: number | boolean | null | undefined): string {
  if (v === null) return "null";
  switch (typeof v) {
    case "number":
      return Number.isNaN(v) ? "nan" : `num:${v}`;
    case "boolean":
      return `bool:${v}`;
    default:
      return "undef";
  }
}

const cells: Cell[] = [];
for (let i = 0; i < 12; i++) cells.push(cell(i));
for (const c of cells) {
  console.log(kind(c.n), kind(c.b), kind(c.m), kind(c.t), c.n == c.t, c.n === null, c.t == null);
}
console.log(cells[3], cells[10]);
console.log(JSON.stringify(cells.slice(0, 5)));

// Writes switch arms in place.
const c0 = cells[0]!;
c0.n = 5;
c0.n = c0.n * 2;
c0.b = !c0.b;
c0.m = c0.m === true ? 1 : false;
c0.t = c0.t ?? 3;
c0.t = (c0.t ?? 0) + 0.5;
console.log(c0, c0.n + 1, c0.b ? "yes" : "no");
c0.n = null;
c0.t = undefined;
console.log(c0, `${c0.n}|${c0.t}|${c0.b}|${c0.m}`, String(c0.t));

// Sorting and grouping by optional fields.
const sorted = [...cells].sort((x, y) => (x.t ?? -1) - (y.t ?? -1) || (x.n ?? 0) - (y.n ?? 0));
console.log(sorted.map((c) => `${c.t}/${c.n}`).join(" "));
const byB = new Map<string, Cell[]>();
for (const c of cells) {
  const key = String(c.b);
  const list = byB.get(key) ?? [];
  list.push(c);
  byB.set(key, list);
}
for (const [key, list] of byB) console.log(key, list.length, list.map((c) => c.m).join(","));

// Fields read into locals, compared and passed along.
function sumKnown(list: Cell[]): number {
  let total = 0;
  for (const c of list) {
    const t = c.t;
    if (t !== undefined && t !== null) total += t;
    const n = c.n;
    if (typeof n === "number") total += n;
  }
  return total;
}
console.log(sumKnown(cells));
function swap(c: Cell): Cell {
  return { n: typeof c.m === "number" ? c.m : null, b: c.b, m: c.n ?? false, t: c.t };
}
console.log(cells.slice(4, 7).map(swap));
