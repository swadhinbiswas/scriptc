// Virtual and abstract methods whose bodies can return undefined (or a
// primitive the declared type does not name) at runtime. Every member of an
// override family shares one result representation, and calls through the
// base or abstract declaration observe the same value Node does.

abstract class Scope {
  abstract get(slot: number): number;
  abstract get size(): number;
  describe(slot: number): string {
    return `slot ${slot} = ${this.get(slot)}`;
  }
}

class ArrayScope extends Scope {
  values: number[] = [1, 2, 3];
  get(slot: number): number {
    return this.values[slot];
  }
  get size(): number {
    return this.values[this.values.length];
  }
}

class ConstScope extends Scope {
  readonly value: number;
  constructor(value: number) {
    super();
    this.value = value;
  }
  get(slot: number): number {
    return this.value + slot;
  }
  get size(): number {
    return 1;
  }
}

class NarrowedScope extends Scope {
  values: number[] = [7, 8];
  get(slot: number): number {
    const value = this.values[slot];
    if (value === undefined) return -1;
    return value;
  }
  get size(): number {
    return this.values.length;
  }
}

// The assertion is the author's presence claim; only in-range slots are read.
class AssertedScope extends Scope {
  values: number[] = [4, 5, 6];
  get(slot: number): number {
    const value = this.values[slot]!;
    return value;
  }
  get size(): number {
    return this.values.length;
  }
}

const asserted: Scope = new AssertedScope();
console.log(asserted.get(0), asserted.get(2), asserted.describe(1), asserted.size);
const scopes: Scope[] = [new ArrayScope(), new ConstScope(10), new NarrowedScope()];
for (const scope of scopes) {
  console.log(scope.get(0), scope.get(1), scope.get(9));
  console.log(typeof scope.get(9), scope.get(9) === undefined, scope.size);
  console.log(scope.describe(2), "|", scope.describe(5));
  console.log(scope.get(9) + 1, String(scope.get(9)), `${scope.get(1)}`);
}
const single: Scope = new ArrayScope();
console.log(single.get(2), single.get(3), single.get(-1));
let total = 0;
for (let i = 0; i < 5; i++) total += single.get(i);
console.log(total);

// A concrete base whose override reads an element, and a third level.
class Picker {
  pick(i: number): number {
    return i * 10;
  }
}
class ListPicker extends Picker {
  items: number[] = [5, 6];
  pick(i: number): number {
    return this.items[i];
  }
}
class FallbackPicker extends ListPicker {
  pick(i: number): number {
    const picked = super.pick(i);
    return picked === undefined ? super.pick(0) : picked;
  }
}
const pickers: Picker[] = [new Picker(), new ListPicker(), new FallbackPicker()];
for (const picker of pickers) console.log(picker.pick(1), picker.pick(4));

// A string element plus a number is NaN when the element is missing.
abstract class Namer {
  abstract label(i: number): string;
}
class ArrayNamer extends Namer {
  names: string[] = ["a", "b"];
  label(i: number): string {
    return this.names[i] + 1;
  }
}
class FixedNamer extends Namer {
  label(i: number): string {
    return "n" + i;
  }
}
const namers: Namer[] = [new ArrayNamer(), new FixedNamer()];
for (const namer of namers) console.log(namer.label(0), namer.label(5), typeof namer.label(5));

// Declared optional results: map and optional-chain reads.
abstract class Lookup {
  abstract find(key: string): number | undefined;
}
class MapLookup extends Lookup {
  entries = new Map<string, number>([["x", 1]]);
  find(key: string): number | undefined {
    return this.entries.get(key);
  }
}
class Node2 {
  readonly value: number;
  constructor(value: number) {
    this.value = value;
  }
}
class ChainLookup extends Lookup {
  next: Node2 | undefined = undefined;
  find(key: string): number | undefined {
    if (key === "set") this.next = new Node2(42);
    return this.next?.value;
  }
}
class ElementLookup extends Lookup {
  values: number[] = [3];
  find(key: string): number | undefined {
    return this.values[key.length - 1];
  }
}
const lookups: Lookup[] = [new MapLookup(), new ChainLookup(), new ElementLookup()];
for (const lookup of lookups)
  console.log(lookup.find("x"), lookup.find("set"), lookup.find("missing") ?? "none");

// Union-typed fields read through virtual methods.
abstract class Cell {
  abstract read(): number | string;
  abstract at(i: number): number | string;
}
class MixedCell extends Cell {
  value: number | string = 1;
  items: (number | string)[] = ["a", 2];
  read(): number | string {
    this.value = typeof this.value === "number" ? `${this.value}!` : this.value.length;
    return this.value;
  }
  at(i: number): number | string {
    return this.items[i];
  }
}
class NumberCell extends Cell {
  value = 5;
  read(): number | string {
    return this.value;
  }
  at(i: number): number | string {
    return i;
  }
}
const cells: Cell[] = [new MixedCell(), new NumberCell()];
for (const cell of cells) console.log(cell.read(), cell.read(), cell.at(0), cell.at(1), cell.at(7));

// Results stored into declared bindings and used in arithmetic.
class Tail {
  values: number[] = [1];
  get last(): number {
    return this.values[5];
  }
  at(i: number): number {
    return this.values[i];
  }
}
const tail = new Tail();
const lastValue: number = tail.last;
const atValue: number = tail.at(4);
console.log(tail.last + 1, lastValue, atValue, [tail.last, tail.at(3)], Math.max(tail.last, 1));
abstract class Source {
  abstract at(i: number): number;
  abstract get last(): number;
}
class ArraySource extends Source {
  values: number[] = [1];
  at(i: number): number {
    return this.values[i];
  }
  get last(): number {
    return this.values[3];
  }
}
class IndexSource extends Source {
  at(i: number): number {
    return i;
  }
  get last(): number {
    return 0;
  }
}
const sources: Source[] = [new ArraySource(), new IndexSource()];
for (const source of sources) {
  const at: number = source.at(4);
  const last = source.last;
  console.log(source.at(4) + 1, at, last, Math.max(source.at(9), 1), source.last * 2, `${source.last}`);
  if (source.last !== undefined) console.log("defined", source.last);
}
