// Closure calls resolved through callback parameters, adapters and
// captures, and owned locals moved into return values.

class Cell {
  value: string;
  next: Cell | undefined = undefined;
  constructor(value: string) {
    this.value = value;
  }
}

class Store {
  cell: Cell;
  constructor(cell: Cell) {
    this.cell = cell;
  }
}

function churn(): number {
  let n = 0;
  for (let i = 0; i < 100; i++) n += new Cell("k" + i).value.length;
  return n;
}

function show(c: Cell | undefined): string {
  return c === undefined ? "none" : c.value;
}

// The callback a caller passes replaces the field the caller lends.
function withCallback(s: Store, c: Cell, f: (s: Store) => void): string {
  f(s);
  churn();
  return show(c);
}
function each(cells: Cell[], f: (c: Cell) => string): string {
  return cells.map(f).join(",");
}

// Captured state written by the callback.
function capture(s: Store): string {
  let seen = s.cell;
  const record = (c: Cell): string => {
    seen = c;
    return c.value;
  };
  const listed = each([new Cell("a"), new Cell("b")], record);
  return listed + " " + seen.value;
}

// Returning owned locals: plain, from a loop, and through a finally.
function build(n: number): Cell {
  const head = new Cell("head" + n);
  let cur = head;
  for (let i = 0; i < n; i++) {
    const c = new Cell("c" + i);
    cur.next = c;
    cur = c;
  }
  return head;
}
function pick(cells: Cell[], want: string): Cell | undefined {
  for (const c of cells) {
    const found = c;
    if (found.value === want) return found;
  }
  return undefined;
}
function guarded(n: number): Cell {
  const c = new Cell("guarded" + n);
  try {
    if (n > 1) return c;
    return new Cell("small");
  } finally {
    c.value += "!";
  }
}

const s1 = new Store(new Cell("one"));
console.log(
  withCallback(s1, s1.cell, (s) => {
    s.cell = new Cell("replaced");
  }),
  s1.cell.value,
);
const s2 = new Store(new Cell("two"));
console.log(withCallback(s2, s2.cell, () => {}), s2.cell.value);
console.log(capture(new Store(new Cell("start"))));
let walk: Cell | undefined = build(3);
const parts: string[] = [];
while (walk !== undefined) {
  parts.push(walk.value);
  walk = walk.next;
}
console.log(parts.join(">"));
const cells = [new Cell("x"), new Cell("y"), new Cell("z")];
console.log(show(pick(cells, "y")), show(pick(cells, "w")));
console.log(guarded(2).value, guarded(0).value);
console.log(each(cells, (c) => c.value.toUpperCase()));
