// Typed records, arrays and classes seen as `unknown` and inspected
// reflectively: for-in, Object.keys/values/entries, `in`, hasOwn, keyed
// reads, typeof and Array.isArray. Keys come back in declaration order
// with absent optional fields left out; nested records keep their identity
// across reads; writes, added keys, deletes and prototype changes made
// through the dynamic view are visible to every later walk; and keys
// added or deleted during a for-in follow the JS snapshot rules.
type Point = { x: number; y: number; label: string };
type Shape = { name: string; at: Point; tags: string[]; note?: string; size?: number };
type Loose = { x: number; y: number; label?: string };
type Flags = { on: boolean; off: boolean; count: number };
type Numbered = { b: number; 2: string; a: number; 1: string };

function describe(label: string, value: unknown): void {
  const keys: string[] = [];
  for (const key in value as Record<string, unknown>) keys.push(key);
  const object = value as Record<string, unknown>;
  console.log(
    label,
    typeof value,
    Array.isArray(value),
    "for-in",
    keys.join(","),
    "keys",
    Object.keys(object).join(","),
    "values",
    JSON.stringify(Object.values(object)),
    "entries",
    JSON.stringify(Object.entries(object)),
  );
}

function probe(label: string, value: unknown, names: string[]): void {
  const object = value as Record<string, unknown>;
  const parts: string[] = [];
  for (const name of names) {
    parts.push(
      `${name}:${name in object ? "in" : "-"}/${Object.hasOwn(object, name) ? "own" : "-"}/${JSON.stringify(object[name]) ?? "undefined"}`,
    );
  }
  console.log(label, parts.join(" "));
}

const point: Point = { x: 1, y: 2, label: "p" };
const shape: Shape = { name: "box", at: point, tags: ["a", "b"] };
const shaped: Shape = { name: "dot", at: { x: 0, y: 0, label: "o" }, tags: [], note: "n", size: 3 };
const flags: Flags = { on: true, off: false, count: 0 };

describe("point", point);
describe("shape", shape);
describe("shaped", shaped);
describe("flags", flags);
describe("tags", shape.tags);
probe("shape", shape, ["name", "note", "size", "at", "missing"]);
probe("shaped", shaped, ["note", "size", "tags"]);

// Optional fields that become present, then absent again, natively.
shape.note = "later";
describe("shape+note", shape);
shape.note = undefined;
describe("shape-note", shape);
delete shape.note;
describe("shape-deleted", shape);

// Numeric-like field names enumerate first, ascending.
const numbered: Numbered = { b: 1, 2: "two", a: 3, 1: "one" };
describe("numbered", numbered);

// Identity of nested records through repeated reads.
const seen = shape as unknown as Record<string, unknown>;
console.log("same child", seen.at === seen.at, seen.at === (shape as unknown as { at: unknown }).at);
console.log("same tags", seen.tags === seen.tags);
const childView = seen.at as Record<string, unknown>;
childView.x = 42;
console.log("child write", point.x, JSON.stringify(seen.at));

// Writes and added keys through the dynamic view.
const dynamic = { x: 1, y: 2, label: "d" } as Point as unknown as Record<string, unknown>;
dynamic.y = 20;
describe("written", dynamic);
dynamic.extra = "e";
describe("added", dynamic);
probe("added", dynamic, ["extra", "x"]);
delete dynamic.extra;
describe("removed", dynamic);

// A prototype with enumerable properties joins for-in but not Object.keys.
const inherited = { x: 5, y: 6, label: "i" } as Point as unknown as Record<string, unknown>;
Object.setPrototypeOf(inherited, JSON.parse('{"from":"proto","x":"shadowed"}'));
describe("inherited", inherited);
probe("inherited", inherited, ["from", "x"]);

// Keys added during for-in are not visited; keys deleted before their turn are skipped.
const growing = { x: 1, y: 2, label: "g" } as Loose as unknown as Record<string, unknown>;
const visited: string[] = [];
for (const key in growing) {
  visited.push(key);
  if (key === "x") {
    growing.added = true;
    delete growing.label;
  }
}
console.log("mutating for-in", visited.join(","), Object.keys(growing).join(","));

// Arrays of records under for-in and Object.entries: index keys as strings.
const points: Point[] = [point, { x: 7, y: 8, label: "q" }];
const indexKeys: string[] = [];
for (const key in points as unknown as Record<string, unknown>) indexKeys.push(`${typeof key}:${key}`);
console.log("array for-in", indexKeys.join(","));
console.log("array entries", JSON.stringify(Object.entries(points as unknown as Record<string, unknown>)));

// Class instances: fields are own keys; methods and prototype getters are not.
class Account {
  owner: string;
  balance: number;
  constructor(owner: string, balance: number) {
    this.owner = owner;
    this.balance = balance;
  }
  get doubled(): number {
    return this.balance * 2;
  }
  deposit(amount: number): void {
    this.balance += amount;
  }
}
const account = new Account("ann", 10);
account.deposit(5);
const accountView: unknown = account;
console.log("class keys", Object.keys(accountView as object).join(","), account.doubled);
console.log("class entries", JSON.stringify(Object.entries(accountView as object)));

// Symbols never appear in string-key walks.
const tagged: unknown = { x: 1, y: 2, label: "s" } as Point;
Object.defineProperty(tagged, Symbol("hidden"), { value: 1, enumerable: true });
describe("symbol", tagged);

// Copies out of a typed record seen as unknown: Object.assign and object rest.
const source: unknown = { name: "copy", at: { x: 3, y: 4, label: "c" }, tags: ["t"], size: 9 } as Shape;
const assigned = Object.assign({ first: true }, source as object) as Record<string, unknown>;
console.log("assign", Object.keys(assigned).join(","), JSON.stringify(assigned), assigned.at === (source as Shape).at);
const { name: restName, ...rest } = source as Record<string, unknown>;
console.log("rest", restName, Object.keys(rest).join(","), JSON.stringify(rest));

// for-of over a typed array seen as unknown, growing and shrinking while iterating.
const live: Point[] = [{ x: 1, y: 1, label: "a" }, { x: 2, y: 2, label: "b" }];
const liveView: unknown = live;
const order: string[] = [];
for (const item of liveView as Point[]) {
  order.push(item.label);
  if (item.label === "a") live.push({ x: 3, y: 3, label: "c" });
  if (item.label === "c") live.length = 3;
}
console.log("live for-of", order.join(","), live.length);
