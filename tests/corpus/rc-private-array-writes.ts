// Element stores into a function's own fresh array (the map, filter and
// fused helpers' results, and hand-written builders) cannot release an
// element of another array, so elements read from the input stay borrowed
// across callbacks. Arrays that escape, are read back, or are the input
// itself keep the conservative ownership; each "must own" case below makes
// the overwritten slot the last owner, churns the allocator and reads the
// value again.

class Item {
  name: string;
  weight: number;
  constructor(name: string, weight: number) {
    this.name = name;
    this.weight = weight;
  }
  label(): string {
    return `${this.name}:${this.weight}`;
  }
}

function churn(): number {
  let total = 0;
  for (let i = 0; i < 64; i++) total += new Item(`tmp${i}`, i).weight;
  return total;
}

const log: string[] = [];
const scratch: Item[] = [];

// map/filter callbacks that write unrelated arrays: borrowed elements stay valid.
function mapped(items: Item[]): string[] {
  return items.map((item) => {
    scratch.push(new Item("s", scratch.length));
    if (scratch.length > 3) scratch.length = 0;
    log.push(item.name);
    churn();
    return item.label();
  });
}

function heavy(items: Item[]): Item[] {
  return items.filter((item) => {
    scratch[0] = new Item("replaced", item.weight);
    churn();
    return item.weight > 1;
  });
}

// A hand-written builder: a fresh local array that is only stored into and returned.
function build(items: Item[], extra: (item: Item) => Item): Item[] {
  const out: Item[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    out.push(extra(item));
    out[out.length - 1] = extra(item);
    churn();
  }
  return out;
}

// Must own: the callback overwrites the very array being filtered.
function selfOverwrite(items: Item[]): string[] {
  const kept = items.filter((item, i) => {
    items[i] = new Item(`new${i}`, -1);
    churn();
    return item.weight >= 0 && item.name.length > 0;
  });
  return kept.map((item) => item.label());
}

// Must own: a fresh array that escapes into a holder before it is written.
const holder: Item[][] = [];
function escaped(): string {
  const out: Item[] = [new Item("first", 1)];
  holder.push(out);
  const first = holder[holder.length - 1]![0]!;
  out[0] = new Item("second", 2);
  churn();
  return first.label();
}

// Must own: a fresh array whose element is read back before it is overwritten.
function readBack(): string {
  const out: Item[] = [];
  out.push(new Item("kept", 3));
  const kept = out[0]!;
  out[0] = new Item("other", 4);
  out.length = 0;
  churn();
  return kept.label();
}

// Must own: the fresh array is passed to a callee that clears it.
function clear(list: Item[]): void {
  list.length = 0;
}
function passed(): string {
  const out: Item[] = [new Item("passed", 5)];
  const head = out[0]!;
  clear(out);
  churn();
  return head.label();
}

const base = [new Item("a", 1), new Item("b", 2), new Item("c", 3)];
console.log(mapped(base).join(","));
console.log(log.join(""));
console.log(
  heavy(base)
    .map((item) => item.label())
    .join(","),
);
console.log(
  build(base, (item) => new Item(item.name.toUpperCase(), item.weight * 10))
    .map((item) => item.label())
    .join(","),
);
console.log(selfOverwrite([new Item("x", 1), new Item("y", 2)]).join(","));
console.log(escaped(), holder.length, holder[0]![0]!.label());
console.log(readBack());
console.log(passed());
const numbers = base.map((item) => item.weight * 2);
numbers[0] = 100;
console.log(numbers.join(","), base.map((item) => item.label()).join(","));
