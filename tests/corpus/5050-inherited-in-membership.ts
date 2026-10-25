// `in` answers inherited members the way Node does: records, checked
// objects and arrays see Object.prototype (and Array.prototype), class
// instances seen as `unknown` see their class's methods and accessors,
// and null-prototype objects see nothing they do not own.
type Point = { x: number; y: number; note?: string };
type Shape = { kind: "circle"; r: number } | { kind: "square"; side: number };

function probe(label: string, value: unknown, names: string[]): void {
  const object = value as Record<string, unknown>;
  console.log(label, names.map((name) => `${name}:${name in object}`).join(" "));
}

const common = ["toString", "hasOwnProperty", "constructor", "valueOf", "__proto__", "isPrototypeOf", "missing"];

// Static records fold to the same answers as their dynamic views.
const point: Point = { x: 1, y: 2 };
console.log("static", "toString" in point, "valueOf" in point, "x" in point, "note" in point, "z" in point);
const shape: Shape = { kind: "circle", r: 1 };
console.log("union", "hasOwnProperty" in shape, "r" in shape, "side" in shape);
probe("record", point, [...common, "x", "note"]);
point.note = "n";
probe("record+note", point, ["note", "toString"]);

// Index-signature records with runtime keys.
const dict: Record<string, number> = { q: 1 };
for (const name of ["q", "toString", "constructor", "nope"]) console.log("dict", name, name in dict);

// Checked-dynamic objects and arrays.
const parsed = JSON.parse('{"a":1,"toString":"own"}') as Record<string, unknown>;
probe("parsed", parsed, [...common, "a"]);
const bare = Object.create(null) as Record<string, unknown>;
bare.a = 1;
probe("null-proto", bare, ["a", "toString", "constructor"]);
const list = JSON.parse("[1,2,3]") as unknown;
probe("array", list, ["push", "map", "length", "0", "3", "toString", "hasOwnProperty", "flatMap", "missing"]);
const typedList: number[] = [4, 5];
probe("typed-array", typedList, ["push", "at", "length", "1", "2", "valueOf"]);
const chained = Object.create({ inherited: true }) as Record<string, unknown>;
probe("chained", chained, ["inherited", "toString", "own"]);

// Class instances seen as unknown: prototype methods and accessors are
// members, static members are not, and a subclass instance answers its
// own class's members even through a base-typed reference.
class Account {
  owner = "ann";
  balance = 10;
  static bank = "b";
  get doubled(): number {
    return this.balance * 2;
  }
  set limit(value: number) {
    this.balance = value;
  }
  deposit(amount: number): void {
    this.balance += amount;
  }
  static open(): Account {
    return new Account();
  }
}
class Savings extends Account {
  rate = 0.1;
  accrue(): void {
    this.balance += this.balance * this.rate;
  }
}
const accountNames = ["owner", "balance", "doubled", "limit", "deposit", "accrue", "rate", "bank", "open", "constructor", "toString", "missing"];
probe("account", new Account() as unknown, accountNames);
const base: Account = new Savings();
probe("savings", base as unknown, accountNames);
const savings = new Savings();
savings.accrue();
const savingsSeen: unknown = savings;
const savingsView = savingsSeen as Record<string, unknown>;
savingsView.extra = 1;
probe("savings+extra", savingsView, ["extra", "accrue", "rate"]);
