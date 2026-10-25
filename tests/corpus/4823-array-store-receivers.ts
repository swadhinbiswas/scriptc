// Element stores read a local array receiver in place when the index and
// value cannot rebind it. Stores whose operands do rebind the receiver, or
// call code that replaces it, still write the array the receiver named
// when the store began.
let grid: number[] = [1, 2, 3, 4];
let spare: number[] = [10, 20, 30, 40];
function swapGrid(): number {
  const old = grid;
  grid = spare;
  spare = old;
  return 99;
}

// Ping-pong buffers swapped every pass (a stencil).
function smooth(input: number[], passes: number): number[] {
  let cur = input.slice();
  let nxt = input.slice();
  for (let p = 0; p < passes; p++) {
    for (let i = 1; i < cur.length - 1; i++) nxt[i] = (cur[i - 1] + cur[i] + cur[i + 1]) / 3;
    const tmp = cur;
    cur = nxt;
    nxt = tmp;
  }
  return cur;
}
console.log("smooth", smooth([0, 9, 0, 9, 0, 9, 0], 3).map((x) => x.toFixed(3)).join(" "));

// The value's evaluation replaces the receiver binding.
let target: number[] = [0, 0, 0];
const other: number[] = [7, 7, 7];
let k = 0;
target[k] = ((target = other), 5);
console.log("rebind in value", target.join(","), other.join(","));

// A call in the value replaces a global receiver and drops its old array.
grid[1] = swapGrid();
console.log("call in value", grid.join(","), spare.join(","));

// Reference elements: the replaced element is released after the store,
// and the receiver stays alive through that release.
class Node {
  label: string;
  owner: Node[] | null;
  constructor(label: string, owner: Node[] | null) {
    this.label = label;
    this.owner = owner;
  }
}
let row: Node[] = [new Node("a", null), new Node("b", null)];
row[0]!.owner = row;
let held = row;
row = [new Node("c", null)];
held[0] = new Node("d", held);
held[1] = held[0]!;
console.log("refs", held.map((n) => n.label).join(","), row[0]!.label, held[0]!.owner === held);
held = [];
console.log("released", held.length, row.length);

// Index expressions that read the receiver.
const counts: number[] = [0, 0, 0, 0];
for (let i = 0; i < 20; i++) counts[counts[i % 4]! % 4] = counts[i % 4]! + i;
console.log("counts", counts.join(","));
