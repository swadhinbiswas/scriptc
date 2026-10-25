// Speculative integer loops over values read from strings, arrays, records
// and module constants: reads that are not integers (NaN past a string's
// end, fractional elements and fields, a fractional divisor) must continue
// with exactly Node's doubles.

function show(label: string, value: number): void {
  console.log(label, Object.is(value, -0) ? "-0" : String(value));
}

function hashText(s: string, extra: number): number {
  let h: number = 0;
  for (let i: number = 0; i < s.length + extra; i++) h = (h * 33 + s.charCodeAt(i)) % 2147483647;
  return h;
}
show("hash", hashText("speculative integer loops", 0));
show("hash past end", hashText("speculative integer loops", 1));
show("hash empty", hashText("", 0));
show("hash unicode", hashText("héllo wörld \u{1F600}", 0));

function mixElements(xs: number[]): number {
  let a: number = 1;
  for (let i: number = 0; i < xs.length; i++) a = (a * 7 + (xs[i]! % 100)) % 65521;
  return a;
}
show("elements", mixElements([1, 2, 3, 400, 5000, 60000]));
show("elements fraction", mixElements([1, 2, 3.5, 4, 5]));
show("elements negative", mixElements([1, -2, -300, 4]));
show("elements huge", mixElements([1, 2 ** 60, 3]));
show("elements NaN", mixElements([1, NaN, 3]));

interface Item {
  id: number;
  weight: number;
}
function checksum(items: Item[]): number {
  let c: number = 0;
  for (let i: number = 0; i < items.length; i++) c = (c * 31 + items[i]!.id) % 1000000007;
  return c;
}
const items: Item[] = [];
for (let i: number = 0; i < 50; i++) items.push({ id: (i * 7919) % 1000003, weight: i / 4 });
show("checksum", checksum(items));
items[25] = { id: 12.25, weight: 0 };
show("checksum fraction", checksum(items));
items[25] = { id: -0, weight: 0 };
show("checksum -0", checksum(items));

class Cell {
  value: number;
  constructor(value: number) {
    this.value = value;
  }
}
function sumCells(cells: Cell[]): number {
  let s: number = 0;
  for (let i: number = 0; i < cells.length; i++) s = (s * 3 + cells[i]!.value) % 1000003;
  return s;
}
show("cells", sumCells([new Cell(1), new Cell(2), new Cell(3)]));
show("cells fraction", sumCells([new Cell(1), new Cell(2.5), new Cell(3)]));

// Module constants written only by top-level code act as loop invariants.
const modulus: number = Number("1048573");
const fractional: number = Number("2.5");
const zero: number = Number("0");
function hashWith(n: number, m: number): number {
  let h: number = 7;
  for (let i: number = 0; i < n; i++) h = (h * 33 + i) % m;
  return h;
}
function hashModule(n: number): number {
  let h: number = 7;
  for (let i: number = 0; i < n; i++) h = (h * 33 + i) % modulus;
  return h;
}
function hashFractional(n: number): number {
  let h: number = 7;
  for (let i: number = 0; i < n; i++) h = (h * 33 + i) % fractional;
  return h;
}
function hashZero(n: number): number {
  let h: number = 7;
  for (let i: number = 0; i < n; i++) h = (h * 33 + i) % zero;
  return h;
}
show("module modulus", hashModule(10000));
show("module fractional", hashFractional(1000));
show("module zero", hashZero(10));
show("parameter modulus", hashWith(10000, modulus));
show("parameter fractional", hashWith(100, fractional));
