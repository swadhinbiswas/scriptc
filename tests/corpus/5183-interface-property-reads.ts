// Property reads through interfaces implemented by program classes: fields
// of number, string, boolean and union types, inherited and initialized
// fields, getters, object-literal implementations, writes followed by
// reads, and a missing receiver.
interface Item {
  id: number;
  label: string;
  active: boolean;
  tag: string | number;
}

class Basic implements Item {
  id: number;
  label = "basic";
  active = true;
  tag: string | number = "t";
  constructor(id: number) {
    this.id = id;
  }
}

class Derived extends Basic {
  extra = 1;
  constructor(id: number) {
    super(id);
    this.label = "derived";
    this.tag = id * 2;
  }
}

class Computed implements Item {
  id = 3;
  active = false;
  tag: string | number = 0;
  get label(): string {
    return `computed ${this.id}`;
  }
}

const literal: Item = { id: 9, label: "literal", active: true, tag: "x" };
const items: Item[] = [new Basic(1), new Derived(2), new Computed(), literal];

for (const item of items) {
  const id: number = item.id;
  const label: string = item.label;
  const active: boolean = item.active;
  console.log(id, label, active, item.tag, label.length + id);
}

let sum = 0;
let chars = 0;
for (let i = 0; i < 400; i++) {
  const item = items[i % items.length]!;
  sum += item.id;
  chars += item.label.length;
  if (item.active) sum += 1;
}
console.log(sum, chars);

const first: Item = items[0]!;
first.label = "renamed";
first.id = 10;
console.log(first.label, first.id, (items[0] as Basic).label);

const missing = undefined as unknown as Item;
try {
  console.log(missing.label);
} catch (error) {
  console.log((error as Error).name, (error as Error).message);
}
