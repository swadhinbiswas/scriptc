// Callbacks entered with lent arguments: array helpers and user-defined
// higher-order functions pass elements and temporaries to closure bodies
// that borrow them. Callbacks that overwrite, truncate or replace the
// source array, rebind the binding that holds it, keep their argument, or
// throw still observe live values.
class Cell {
  name: string;
  value: number;
  constructor(name: string, value: number) {
    this.name = name;
    this.value = value;
  }
  describe(): string {
    return `${this.name}=${this.value}`;
  }
}

function cells(prefix: string, n: number): Cell[] {
  const out: Cell[] = [];
  for (let i = 0; i < n; i++) out.push(new Cell(prefix + i, i * 3 - 4));
  return out;
}

function each(items: Cell[], f: (c: Cell, i: number) => void): void {
  for (let i = 0; i < items.length; i++) f(items[i]!, i);
}

function total(items: Cell[], f: (c: Cell) => number): number {
  let sum = 0;
  for (let i = 0; i < items.length; i++) sum += f(items[i]!);
  return sum;
}

function label(f: (s: string, c: Cell) => string, c: Cell): string {
  return f("<" + c.name + ">", c);
}

// Element callbacks that overwrite the element they were handed.
const grid = cells("g", 6);
const overwritten: string[] = [];
each(grid, (c, i) => {
  grid[i] = new Cell("replaced" + i, -i);
  overwritten.push(c.describe());
});
console.log("overwrite", overwritten.join(" "), grid.map((c) => c.name).join(","));

// Truncating the array while its elements are being visited.
let row = cells("r", 5);
const visited: string[] = [];
each(row, (c) => {
  row.length = 0;
  visited.push(c.describe());
});
console.log("truncate", visited.join(" "), row.length);

// Rebinding the captured binding that held the only reference.
row = cells("s", 4);
const seen: string[] = [];
const viaRebind = (c: Cell): number => {
  row = [new Cell("other", 99)];
  seen.push(c.name);
  return c.value;
};
console.log("rebind", total(row, viaRebind), seen.join(","), row[0]!.name);

// Callbacks that keep or return what they are lent.
const keep: Cell[] = [];
const source = cells("k", 4);
each(source, (c) => {
  keep.push(c);
});
source.length = 0;
console.log("keep", keep.map((c) => c.describe()).join(" "));
const picked = cells("p", 5).map((c) => (c.value > 0 ? c : new Cell("neg", 0)));
console.log("map", picked.map((c) => c.describe()).join(" "));
const found = cells("f", 6).find((c) => c.value === 5);
console.log("find", found?.describe());

// Temporaries passed to a lending body stay owned by the caller.
const wrap = (s: string, c: Cell): string => s + ":" + c.value;
console.log("temps", cells("t", 3).map((c) => label(wrap, c)).join(" "));

// Different closures through one call site, including declared functions.
function double(c: Cell): number {
  return c.value * 2;
}
const scorers: ((c: Cell) => number)[] = [double, (c) => c.name.length, (c) => {
  c.value += 1;
  return c.value;
}];
const pool = cells("q", 4);
for (const f of scorers) console.log("score", total(pool, f));

// A throwing callback leaves the remaining elements alive.
const fragile = cells("x", 5);
try {
  each(fragile, (c, i) => {
    fragile[i] = new Cell("swap", i);
    if (c.value > 3) throw new Error("bad " + c.describe());
  });
} catch (e) {
  console.log("caught", (e as Error).message);
}
console.log("after", fragile.map((c) => c.describe()).join(" "));

// Pipelines over records.
const events = Array.from({ length: 40 }, (_, i) => ({ user: i % 7, kind: i % 3 === 0 ? "buy" : "view", amount: i }));
const scored = events
  .filter((e) => e.kind === "buy")
  .map((e) => ({ user: e.user, score: e.amount * 2 }))
  .filter((s) => s.score > 10);
console.log("pipeline", scored.length, scored.reduce((sum, s) => sum + s.score, 0));
console.log(
  "some/every",
  events.some((e) => e.user === 6 && e.kind === "buy"),
  events.every((e) => e.amount >= 0),
  events.findIndex((e) => e.amount === 33),
);

// Declared functions as callbacks: one that only reads, one that rewrites
// and truncates the array being mapped.
function describeCell(c: Cell): string {
  return c.describe();
}
const victims = cells("v", 4);
function clobber(c: Cell): string {
  victims[0] = new Cell("new", 0);
  victims.length = 1;
  return c.describe();
}
console.log("declared", cells("w", 3).map(describeCell).join(" "), victims.map(clobber).join(" "));
