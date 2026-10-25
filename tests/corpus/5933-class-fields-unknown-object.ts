// TypeScript class fields declared `unknown` or `object` (also with
// `null` or `undefined`, or as arrays) hold any value of those types.
// Reads narrow with typeof and instanceof, stored references keep their
// identity, and static fields and parameter properties work the same way.
class Item {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
  greet(): string {
    return `item ${this.name}`;
  }
}

class Slot {
  value: unknown = null;
  data: object | null = null;
  list: unknown[] = [];
  extra?: unknown;
  set(next: unknown): void {
    this.value = next;
  }
  describe(): string {
    if (typeof this.value === "string") return `string of ${this.value.length}`;
    if (typeof this.value === "number") return `number ${this.value * 2}`;
    if (this.value instanceof Item) return this.value.greet();
    if (Array.isArray(this.value)) return `array of ${this.value.length}`;
    return `other ${String(this.value)}`;
  }
}

class Holder {
  payload: unknown;
  readonly meta: object;
  constructor(payload: unknown, meta: object) {
    this.payload = payload;
    this.meta = meta;
  }
}

class Registry {
  static current: unknown = null;
  static entries: object[] = [];
}

class Cell<T> {
  item: T;
  note: unknown = undefined;
  constructor(item: T) {
    this.item = item;
  }
}

const slot = new Slot();
console.log(slot.value, slot.data, slot.list, slot.extra, slot.describe());
const item = new Item("a");
for (const next of ["text", 21, item, [1, 2, 3], true, undefined] as unknown[]) {
  slot.set(next);
  console.log(slot.describe());
}

slot.value = item;
item.name = "b";
console.log((slot.value as Item).name, slot.value === item);
const record = { count: 1 };
slot.data = record;
record.count = 2;
console.log(slot.data, slot.data === record);
const numbers = [1, 2];
slot.data = numbers;
numbers.push(3);
console.log(slot.data, slot.data === numbers);
const lookup = new Map<string, number>([["k", 1]]);
slot.value = lookup;
lookup.set("j", 2);
console.log(slot.value);
const double = (x: number): number => x * 2;
slot.value = double;
if (typeof slot.value === "function") console.log(slot.value === double, (slot.value as (x: number) => number)(4));
slot.list.push(item, 1, null, "s");
console.log(slot.list.length, slot.list[0] === item, slot.list.slice(1));
slot.extra = { nested: [1, { deep: true }] };
console.log(JSON.stringify(slot.extra), slot.extra ?? "none");
slot.value = undefined;
console.log(slot.value === undefined, slot.value ?? "fallback");

const holder = new Holder([1, 2, 3], { tag: "m" });
console.log(Array.isArray(holder.payload), holder.payload, holder.meta);
const values: unknown[] = [holder.payload, holder.meta];
console.log(values.length, values[0] === holder.payload);

console.log(Registry.current, Registry.entries);
Registry.current = { a: 1 };
Registry.entries.push(record, numbers);
console.log(Registry.current, Registry.entries.length, Registry.entries[0] === record);

const cell = new Cell<number>(1);
cell.note = "note";
console.log(cell.item, cell.note, typeof cell.note);
