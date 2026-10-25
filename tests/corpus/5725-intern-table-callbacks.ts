import { InternTable } from "@scriptc/experimental";

// InternTable.getOrInsertComputed callbacks (@scriptc/experimental): the
// callback runs only when the key has no value, sees the key and the
// enclosing scope, and its side effects happen in the order Node.js runs
// them. Node.js prints the same.

class Item {
  readonly label: string;
  readonly n: number;
  constructor(label: string, n: number) {
    this.label = label;
    this.n = n;
  }
}

const items = new InternTable<string, Item>("callbacks.items");
const log: string[] = [];
let made = 0;
function make(label: string): Item {
  log.push(`make ${label}`);
  return new Item(label, ++made);
}

// Expression arrows, with and without the key parameter.
console.log(items.getOrInsertComputed("a", (k) => make(k)).n, items.getOrInsertComputed("a", (k) => make(k)).n);
console.log(items.getOrInsertComputed("b", () => make("bee")).label, made);
// A parameter that shadows an outer binding, and a wider parameter type.
const k = "outer";
console.log(items.getOrInsertComputed("c", (k) => new Item(k + "!", 0)).label, k);
console.log(items.getOrInsertComputed("d", (key: string | number) => new Item(`${typeof key}:${key}`, 1)).label);
// The enclosing scope: reads and writes of outer variables.
let counter = 10;
const e = items.getOrInsertComputed("e", () => new Item("e", counter++));
console.log(e.n, counter, items.getOrInsertComputed("e", () => new Item("e", counter++)).n, counter);
// Nested interning inside a callback.
function chain(depth: number): Item {
  return items.getOrInsertComputed(`chain${depth}`, (key) =>
    depth === 0 ? new Item(key, 0) : new Item(`${key}>${chain(depth - 1).label}`, depth),
  );
}
console.log(chain(3).label, chain(3) === chain(3), items.has("chain0"));
// A callback that stores its own key, and one that throws.
const nested = items.getOrInsertComputed("self", (key) => (items.getOrInsert(key, new Item("inner", 1)), new Item("outer", 2)));
console.log(nested.label, items.get("self")?.label);
try {
  items.getOrInsertComputed("boom", (key) => (key.length > 0 ? (() => { throw new Error(`no ${key}`); })() : new Item(key, 0)));
} catch (error) {
  console.log((error as Error).message, items.has("boom"));
}
// Block bodies and function expressions.
console.log(
  items.getOrInsertComputed("f", (key) => {
    log.push(`block ${key}`);
    return new Item(key, 3);
  }).n,
  items.getOrInsertComputed("g", function (key: string) {
    return new Item(key.toUpperCase(), 4);
  }).label,
);
// Methods that intern with `this` in the callback.
class Factory {
  readonly prefix: string;
  constructor(prefix: string) {
    this.prefix = prefix;
  }
  item(name: string): Item {
    return items.getOrInsertComputed(`${this.prefix}${name}`, (key) => new Item(`${key}/${this.prefix}`, 5));
  }
}
const factory = new Factory("p-");
console.log(factory.item("x").label, factory.item("x") === factory.item("x"));
console.log(log.join("; "), items.size);
