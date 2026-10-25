// Generators as closures, methods, static and private methods, with
// captured state; many short-lived and abandoned generators.
class Matrix {
  private rows: number[][];
  constructor(rows: number[][]) {
    this.rows = rows;
  }
  *cells(): Generator<number, void, undefined> {
    for (const row of this.rows) for (const v of row) yield v;
  }
  *#diag(): Generator<number, void, undefined> {
    for (let i = 0; i < this.rows.length; i++) yield this.rows[i]![i]!;
  }
  trace(): number {
    let t = 0;
    for (const v of this.#diag()) t += v;
    return t;
  }
  static *identity(n: number): Generator<number[], void, undefined> {
    for (let i = 0; i < n; i++) {
      const row: number[] = [];
      for (let j = 0; j < n; j++) row.push(i === j ? 1 : 0);
      yield row;
    }
  }
}
const m = new Matrix([
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
]);
console.log([...m.cells()].join(" "), m.trace());
console.log(JSON.stringify([...Matrix.identity(3)]));

function counter(start: number) {
  let calls = 0;
  const gen = function* (limit: number): Generator<number, void, undefined> {
    for (let i = start; i < limit; i++) {
      calls++;
      yield i;
    }
  };
  return { gen, calls: () => calls };
}
const c = counter(3);
console.log([...c.gen(6)].join(","), [...c.gen(5)].join(","), c.calls());

const prefix = "item";
const labelled = function* (xs: number[]): Generator<string, void, undefined> {
  for (const x of xs) yield `${prefix}-${x}`;
};
console.log([...labelled([1, 2])].join(" "));

// Many short-lived generators, some abandoned after one step.
function* pair(a: string, b: string): Generator<string, void, undefined> {
  yield a;
  yield b;
}
let joined = 0;
let abandoned = 0;
for (let i = 0; i < 2000; i++) {
  const g = pair("x" + i, "y" + i);
  if (i % 3 === 0) {
    joined += g.next().value!.length;
    abandoned++;
  } else {
    for (const s of g) joined += s.length;
  }
}
console.log(joined, abandoned);

// Generators holding object arguments that are never started.
function* holds(o: { n: number }): Generator<number, void, undefined> {
  yield o.n;
}
let made = 0;
for (let i = 0; i < 100; i++) {
  const g = holds({ n: i });
  if (i === 42) console.log(g.next().value);
  made++;
}
console.log(made);
