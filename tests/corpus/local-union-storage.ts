class Cell {
  text: string;
  constructor(text: string) { this.text = text; }
}

function read(value: Cell | undefined): string {
  return value === undefined ? "missing" : value.text;
}
function checked(value: string, fail: boolean): Cell {
  if (fail) throw new Error(value);
  return new Cell(value);
}
function traverse(round: number): string {
  const cells = new Map<number, Cell>();
  cells.set(1, new Cell("first"));
  let current = cells.get(round % 2);
  const result: string[] = [read(current)];
  cells.clear();
  result.push(read(current));
  current = round % 2 ? new Cell("second") : undefined;
  result.push(read(current));
  try {
    current = checked("failed", true);
  } catch (error) {
    result.push((error as Error).message, read(current));
  }
  for (let index = 0; index < 5; index++) {
    current = index % 2 ? new Cell(String(index)) : undefined;
    if (index === 1) continue;
    result.push(read(current));
    if (index === 3) break;
  }
  current = cells.get(1);
  return result.join(":") + ":" + read(current);
}
for (let round = 0; round < 3; round++) console.log(traverse(round));

function scalars(choose: boolean): string {
  let value: string | number | undefined = choose ? "start" : undefined;
  const result = [String(value), String(Boolean(value))];
  value = choose ? -0 : NaN;
  result.push(String(value), String(1 / value));
  value = choose ? Infinity : -Infinity;
  result.push(String(value));
  value = choose ? "end" : undefined;
  result.push(String(value), String(Boolean(value)));
  return result.join(":");
}
console.log(scalars(false), scalars(true));

function collect(values: string[]): string {
  const result: string[] = [];
  for (const value of values) result.push(String(value), String(Boolean(value)));
  return result.join("|");
}
const sparse = ["a", ""];
sparse.length = 5;
console.log(collect(sparse));

function escape(): Cell | undefined {
  let value: Cell | undefined = new Cell("escaped");
  value = new Cell("returned");
  return value;
}
function captured(): string {
  let value: Cell | undefined = new Cell("before");
  const inspect = (): string => read(value);
  value = undefined;
  const first = inspect();
  value = new Cell("after");
  return first + ":" + inspect();
}
console.log(read(escape()), captured());

function assignment(): string {
  let value: Cell | undefined = undefined;
  const copy = (value = new Cell("shared"));
  value = undefined;
  return copy.text + ":" + read(value);
}
console.log(assignment());

function nested(choose: boolean): string {
  let value: string | undefined = choose ? "outer" : undefined;
  const output: string[] = [];
  try {
    value = choose ? checked("rhs", true).text : "other";
  } catch {
    output.push(String(value));
  } finally {
    output.push(String(value));
  }
  return output.join(":");
}
console.log(nested(true), nested(false));

function readAndClear(value: Cell | undefined, cells: Map<number, Cell>): string {
  cells.clear();
  return read(value);
}
function clearCells(cells: Map<number, Cell>): number {
  cells.clear();
  return cells.size;
}
function readWithCount(value: Cell | undefined, count: number): string {
  return read(value) + ":" + count;
}
function callSnapshots(): string {
  const cells = new Map<number, Cell>();
  cells.set(1, new Cell("snapshot"));
  let current = cells.get(1);
  const output = readWithCount(current, clearCells(cells));
  current = new Cell("replacement");
  const next = readAndClear(current, cells);
  current = undefined;
  return output + ":" + next + ":" + readAndClear(current, cells);
}
console.log(callSnapshots());
