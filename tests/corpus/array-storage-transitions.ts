const numbers: number[] = [1, 2, 3];
numbers.length = 9;
numbers[5] = numbers[30];
numbers[8] = -0;
numbers.splice(2, 3, 10, 11, 12, 13);
numbers.copyWithin(4, 1, 7);
numbers.reverse();
const removed = numbers.splice(-6, 2, ...numbers.slice(0, 3));
console.log(JSON.stringify(numbers), numbers.map((_, index) => index).join(","));
console.log(JSON.stringify(removed), removed.map((_, index) => index).join(","));
console.log(numbers.shift(), numbers.pop(), numbers.unshift(8, 9, 10));
console.log(numbers.slice(1).toReversed().join(":"), numbers.join(":"));
numbers.fill(-0, 1, 3);
console.log(numbers.map(value => Object.is(value, -0) ? "negative-zero" : String(value)).join(","));

const effects: string[] = [];
let current = ["old"];
const original = current;
function replace(): string {
  current = ["new"];
  effects.push("replace");
  return "argument";
}
console.log(current.unshift(current[0]!, replace(), current[0]!));
console.log(original.join(","), current.join(","), effects.join(","));
function fail(): string { throw new Error("stop"); }
try { current.push("pending", fail(), "unreached"); } catch (error) {
  if (error instanceof Error) console.log(error.message, current.join(","));
}
function absent(): undefined { effects.push("undefined"); return undefined; }
const optional: (string | undefined)[] = ["x", "y"];
console.log(optional.fill(absent(), (() => { effects.push("start"); return 1; })()) === optional);
console.log(optional.join(","), effects.join(","));
const source = ["before"];
function mutate(): string { source[0] = "after"; return "last"; }
const literal = ["first", ...source, mutate()];
console.log(literal.join(","), source.join(","));
try { const pending = [current[0]!, fail(), current[0]!]; console.log(pending); }
catch (error) { if (error instanceof Error) console.log("literal", error.message); }

class Cell {
  id: number;
  owners: Cell[];
  constructor(id: number) { this.id = id; this.owners = []; }
}
const first = new Cell(1), second = new Cell(2);
const cells = [first, second, first, second];
first.owners = cells;
second.owners = cells;
const cut = cells.splice(1, 2, ...cells);
cells.copyWithin(1, 0, 4);
cells.fill(second, 2, 4);
cells.unshift(first, second);
const shifted = cells.shift();
console.log(cut.map(cell => cell.id).join(","), cells.map(cell => cell.id).join(","));
console.log(shifted === first, first.owners === cells, second.owners === cells);
const self = ["a", "b"];
self.unshift(...self);
self.push(...self);
console.log(self.join(","));

const edge: number[] = [];
edge[1048575] = 4;
edge[1048576] = 5;
edge.copyWithin(1048574, 1048575, 1048577);
edge.unshift(8, 9);
console.log(edge.length, edge[0], edge[1], edge[1048576], edge[1048577]);
edge.length = 3;
edge.push(7, 6, 5);
console.log(edge.join(","), edge.map((_, index) => index).join(","));
