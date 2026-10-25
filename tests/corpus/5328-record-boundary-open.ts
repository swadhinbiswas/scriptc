// Records that reach storage outside their parameters and bindings (an
// array, an object field, a callback) keep their declared layout and their
// identity. These inputs hold every element they read.
interface Cell {
  row: number;
  col: number;
}
function store(cell: Cell, out: Cell[]): Cell {
  out.push(cell);
  return cell;
}
function key(cell: Cell): string {
  return `${cell.row},${cell.col}`;
}
const rows = [1, 2, 3];
const cols = [4, 5, 6];
const out: Cell[] = [];
for (let i = 0; i < 3; i++) {
  const cell = { row: rows[i], col: cols[i] };
  const kept = store(cell, out);
  cell.col += 10;
  console.log(kept === cell, out[i] === cell, key(out[i]!));
}
const holder: { cell: Cell } = { cell: { row: rows[0], col: cols[0] } };
const view = holder.cell;
view.row = 99;
console.log(holder.cell.row, view === holder.cell);
console.log(out.map(key).join(";"), key({ row: rows[1], col: cols[2] }));
