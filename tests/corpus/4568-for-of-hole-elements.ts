// A for-of loop over an array that can hold holes binds undefined for each
// hole. The value then reaches typed parameters, typed locals, record
// fields and numeric code as undefined. Loops over arrays without holes
// read every element as a present value.
interface Bin {
  slot: number;
  count: number;
}

class Shelf {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
  describe(count: number): string {
    return `${this.name}:${count}`;
  }
}

function units(count: number): string {
  return `units=${count}`;
}

const doubled = (count: number): number => count * 2;
const label = (item: string): string => `[${item}]`;

function present(count: number): boolean {
  return count !== undefined;
}

function binLabel(bin: Bin): string {
  return `${bin.slot}/${bin.count}`;
}

// Writes past the end leave holes between the old length and the index.
const restocked = [4];
restocked[3] = 6;
for (const count of restocked) {
  console.log(units(count), doubled(count), present(count));
}

// `new Array(n)` allocates holes; later writes fill some of them.
const reserved: number[] = new Array(3);
reserved[1] = 8;
const shelf = new Shelf("north");
let index = 0;
for (const count of reserved) {
  const typed: number = count;
  const bin: Bin = { slot: index, count: count };
  console.log(shelf.describe(typed), typeof typed, binLabel(bin), JSON.stringify(bin));
  index++;
}

// Growing `length` adds holes at the end.
const pallets = [2, 3];
pallets.length = 4;
let total = 0;
let largest = 0;
for (const count of pallets) {
  total += count;
  largest = Math.max(largest, count);
  console.log(count === undefined ? "empty" : count + 1, String(count), `${count}`);
}
console.log(total, largest);

// String elements and an assignment-form loop over a pre-declared binding.
const names = ["bolt"];
names[2] = "nut";
for (const item of names) console.log(label(item), item === undefined);
let last: string = "";
for (last of names) console.log(typeof last);
console.log(last);

// Destructured entries yield the same undefined for a hole.
for (const [position, item] of names.entries()) console.log(position, label(item));

// An array filled through a helper is walked in its callee too.
function fill(target: number[], at: number): void {
  target[at] = 1;
}
function sum(values: number[]): number {
  let result = 0;
  for (const value of values) result += value === undefined ? 100 : value;
  return result;
}
const crates = [5];
fill(crates, 2);
console.log(sum(crates), sum([1, 2]));

// Present values only: no holes, so every element is a number.
const dense = [1, 2, 3];
dense.push(4);
let denseTotal = 0;
for (const count of dense) {
  denseTotal += doubled(count);
  console.log(units(count), present(count));
}
console.log(denseTotal);
for (const item of ["a", "b"]) console.log(label(item));

// An untyped callee observes the same values.
function show(value: unknown): string {
  return value === undefined ? "missing" : `got ${String(value)}`;
}
for (const count of restocked) console.log(show(count));
for (const count of dense) console.log(show(count));

// Variadic Math statics read a hole or a missing element as NaN.
for (const count of restocked) {
  console.log(Math.hypot(count, 4), Math.max(count, 1, 2), Math.min(9, count), Math.hypot(count));
}
const absent = dense[12];
console.log(Math.hypot(absent, 3), Math.max(absent), Math.min(1, absent));
console.log(Math.hypot(dense[20], 3), Math.max(dense[21], 1), Math.min(dense[0], dense[30]));
console.log(Math.hypot(3, 4), Math.max(...dense), Math.min(...dense), Math.hypot(...dense));
