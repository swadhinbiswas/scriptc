// Values widened into `T | undefined` parameters, identity tests and
// casts: the wrap is the payload pointer itself, so it may borrow when the
// payload can, and must keep an owner when a later operand rebinds it.

class Item {
  name: string;
  next: Item | undefined;
  constructor(name: string, next: Item | undefined) {
    this.name = name;
    this.next = next;
  }
}

class Special extends Item {
  extra = 1;
}

function label(item: Item | undefined): string {
  return item === undefined ? "none" : item.name;
}

function same(a: Item | undefined, b: Item | undefined): boolean {
  return a === b;
}

function order(a: Item | undefined, b: Item | undefined): number {
  if (a === b) return 0;
  if (a === undefined) return 1;
  if (b === undefined) return -1;
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
}

function pick(first: Item | undefined, replace: () => Item, second: Item | undefined): string {
  const fresh = replace();
  return label(first) + "/" + label(second) + "/" + fresh.name;
}

function chain(item: Item): string {
  // A borrowed parameter widened into a nullable argument several times.
  return label(item) + ":" + label(item.next) + ":" + String(same(item, item.next));
}

function special(item: Item): string {
  if (item instanceof Special) {
    const s = item as Special;
    return label(s) + "+" + s.extra + "+" + String(same(s, item));
  }
  return label(item);
}

let shared: Item | undefined = new Item("shared", undefined);

function rebinding(): string {
  let local = new Item("before", undefined);
  // The second operand replaces the local the first operand wraps.
  const result = pick(
    local,
    () => {
      local = new Item("after", undefined);
      return local;
    },
    local,
  );
  // A sequence expression rebinding the wrapped binding between operands.
  let other = new Item("x", undefined);
  const seq = order(other, ((other = new Item("y", undefined)), other));
  return result + " " + seq + " " + label(other);
}

function globalRebinding(): string {
  // A global's wrapped value must survive a callee replacing the global.
  return pick(
    shared,
    () => {
      shared = new Item("replaced", undefined);
      return shared;
    },
    shared,
  );
}

const a = new Item("a", undefined);
const b = new Item("b", a);
const c = new Special("c", b);
console.log(chain(a), chain(b), chain(c));
console.log(special(c), special(b));
console.log(same(a, a), same(a, b), same(undefined, undefined), same(a, undefined));
console.log(order(a, b), order(b, a), order(a, a), order(undefined, a), order(a, undefined));
console.log(rebinding());
console.log(globalRebinding(), label(shared));
const items: Item[] = [c, b, a, new Item("b", undefined)];
items.sort((x, y) => order(x, y));
console.log(items.map((x) => label(x)).join(","));
let walk: Item | undefined = c;
let names = "";
while (walk !== undefined) {
  names += label(walk);
  walk = walk.next;
}
console.log(names);
