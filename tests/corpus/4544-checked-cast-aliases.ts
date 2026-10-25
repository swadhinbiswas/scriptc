// Constant aliases created by checked casts (`x as Sub`, a narrowed
// nullable) of unchanged parameters and locals borrow their source. The
// source binding keeps the object alive even when everything else that
// referenced it is dropped while the alias is in use.

class Type {
  flags: number;
  constructor(flags: number) {
    this.flags = flags;
  }
}

class LiteralType extends Type {
  value: number;
  text: string;
  constructor(flags: number, value: number, text: string) {
    super(flags);
    this.value = value;
    this.text = text;
  }
}

class Holder {
  item: Type | undefined;
  constructor(item: Type | undefined) {
    this.item = item;
  }
}

function sameLiteral(a: Type, b: Type): boolean {
  const x = a as LiteralType;
  const y = b as LiteralType;
  if ((a.flags & 1) !== 0) return x.value === y.value || (x.value !== x.value && y.value !== y.value);
  return x.text === y.text;
}

// The alias outlives every other reference the program held.
function aliasAcrossDrop(a: Type, drop: () => void): string {
  const x = a as LiteralType;
  drop();
  const fresh = new LiteralType(3, 99, "fresh");
  return x.text + ":" + x.value + ":" + fresh.text;
}

function narrowAlias(holder: Holder): string {
  const item = holder.item;
  if (item === undefined) return "none";
  const literal = item as LiteralType;
  holder.item = undefined;
  const fresh = new LiteralType(5, 7, "replacement");
  return literal.text + "/" + fresh.text;
}

const items: Type[] = [
  new LiteralType(1, 1, "one"),
  new LiteralType(1, 1, "uno"),
  new LiteralType(2, 2, "two"),
  new LiteralType(2, 3, "two"),
  new LiteralType(1, NaN, "nan"),
];
console.log(sameLiteral(items[0], items[1]), sameLiteral(items[2], items[3]), sameLiteral(items[4], items[4]));

const holder = new Holder(new LiteralType(2, 42, "held"));
console.log(
  aliasAcrossDrop(holder.item!, () => {
    holder.item = undefined;
  }),
  holder.item === undefined,
);
const holder2 = new Holder(new LiteralType(2, 8, "narrowed"));
console.log(narrowAlias(holder2), narrowAlias(holder2));
