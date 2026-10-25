class Cell {
  text: string;
  constructor(text: string) { this.text = text; }
}
class Holder {
  cell: Cell;
  constructor(text: string) { this.cell = new Cell(text); }
}
function pair(left: string, right: string): string { return left + ":" + right; }
function label(value: Cell): string { return value.text; }
function relay(value: Cell, depth: number): string { return depth === 0 ? label(value) : relay(value, depth - 1); }
function inspect(holder: Holder): string {
  return pair(holder.cell.text, relay(holder.cell, 2));
}
function change(holder: Holder): string {
  holder.cell = new Cell("replacement".repeat(2));
  return holder.cell.text;
}
function replaceInside(cell: Cell, holder: Holder): string {
  holder.cell = new Cell("inside");
  return cell.text;
}
function fail(holder: Holder): string {
  holder.cell = new Cell("failed");
  throw new Error("stopped");
}
function work(): void {
  const holder = new Holder("owned".repeat(2));
  console.log(inspect(holder));
  console.log(pair(holder.cell.text, change(holder)));
  console.log(replaceInside(holder.cell, holder), holder.cell.text);
  const saved = relay(holder.cell, 1);
  change(holder);
  console.log(saved, holder.cell.text);
  try { console.log(pair(holder.cell.text, fail(holder))); }
  catch (error) { console.log((error as Error).message); }
  finally { console.log(holder.cell.text); }
  let local = new Cell("left".repeat(2));
  console.log(pair(local.text, (local = new Cell("right"), local.text)));
  const callback: (cell: Cell) => string = label;
  console.log(callback(local));
}
work();

let current = new Holder("global".repeat(2));
function replaceGlobal(): string { current = new Holder("new global"); return current.cell.text; }
console.log(pair(current.cell.text, replaceGlobal()));
function captured(): void {
  let holder = new Holder("captured".repeat(2));
  function update(): string { holder = new Holder("updated"); return holder.cell.text; }
  console.log(pair(holder.cell.text, update()));
}
captured();

function literal(flag: boolean): string { return flag ? "yes" : "no"; }
function optional(flag: boolean): string | undefined { return flag ? "present" : undefined; }
function entries(): string[] { return ["same", "same", literal(false)]; }
const values = entries();
console.log(values.join("|"), optional(false), optional(true));
values[0] = "changed";
console.log(values.join("|"), literal(true));
function ownedReturn(): string { try { return "returned"; } finally { console.log("finally"); } }
console.log(ownedReturn());
