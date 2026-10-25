export {};

// Optional reads of `T | undefined` element arrays, and local reads whose
// live range may or may not remove the element's last reference.
class Item {
  name: string;
  hits = 0;
  constructor(name: string) {
    this.name = name;
  }
}

type Page = (Item | undefined)[] | undefined;

class Store {
  readonly pages: Page[] = [];
  items: (Item | undefined)[] = [];
  created = 0;

  // A get-or-create store in pages of 4 ids: the page read is dead before
  // the creating path mutates the page table.
  item(id: number): Item {
    const page = this.pages[id >> 2];
    let item = page !== undefined ? page[id & 3] : undefined;
    if (item === undefined) {
      item = new Item(`item${id}`);
      this.created++;
      store(this.pages, id, item);
    }
    return item;
  }

  // The same through an optional chain on the page read.
  peek(id: number): string {
    const item = this.pages[id >> 2]?.[id & 3];
    return item === undefined ? "none" : item.name;
  }

  // The local is still used after the slot is overwritten: it keeps its own
  // reference, so the old element survives until the read.
  replaceThenRead(i: number): string {
    const old = this.items[i];
    this.items[i] = new Item(`new${i}`);
    return old === undefined ? "none" : `${old.name}:${old.hits}`;
  }

  // Truncation and field replacement between the read and its last use.
  truncateThenRead(i: number): string {
    const old = this.items[i];
    this.items.length = 0;
    return old === undefined ? "none" : old.name;
  }

  swapThenRead(i: number): string {
    const old = this.items[i];
    this.items = [new Item("swapped")];
    return old === undefined ? "none" : old.name;
  }

  // Mutation after the last use: the read may borrow.
  readThenMutate(i: number): string {
    const it = this.items[i];
    const label = it === undefined ? "none" : it.name;
    this.items.push(new Item(`pushed${i}`));
    return label;
  }

  // A preserving call consumes the element; a mutating one keeps an owner.
  describe(i: number): string {
    return label(this.items[i]);
  }

  clearAndDescribe(i: number): string {
    return clearing(this, this.items[i]);
  }
}

function store(pages: Page[], id: number, item: Item): void {
  const index = id >> 2;
  while (pages.length <= index) pages.push(undefined);
  let page = pages[index];
  if (page === undefined) {
    page = [];
    for (let i = 0; i < 4; i++) page.push(undefined);
    pages[index] = page;
  }
  page[id & 3] = item;
}

function label(item: Item | undefined): string {
  return item === undefined ? "none" : `${item.name}#${item.hits}`;
}

function clearing(s: Store, item: Item | undefined): string {
  s.items = [];
  return item === undefined ? "none" : `${item.name} after clear`;
}

const s = new Store();
for (let round = 0; round < 3; round++)
  for (let id = 0; id < 11; id += 3) s.item(id).hits++;
console.log("created", s.created, s.item(0).hits, s.item(9).hits);
for (const id of [0, 1, 3, 9, 10, 40]) console.log("peek", id, s.peek(id));

function fill(): void {
  s.items = [new Item("a"), undefined, new Item("c")];
  s.items.push(undefined);
  s.items[6] = new Item("g");
  s.items[0]!.hits = 5;
}
fill();
for (const i of [0, 1, 2, 3, 4, 6, 7, 1.5, -1]) console.log("describe", i, s.describe(i));
for (const i of [0, 1, 2]) console.log("readThenMutate", s.readThenMutate(i), s.items.length);
fill();
for (const i of [0, 1, 6]) console.log("replace", s.replaceThenRead(i), s.items[i]?.name);
fill();
console.log("truncate", s.truncateThenRead(2), s.items.length);
fill();
console.log("swap", s.swapThenRead(6), s.items.length, s.items[0]?.name);
fill();
console.log("clear", s.clearAndDescribe(2), s.items.length);

// An optional chain whose body empties the array that held its receiver.
class Node2 {
  name: string;
  owner: Holder;
  constructor(name: string, owner: Holder) {
    this.name = name;
    this.owner = owner;
  }
  detach(): string {
    this.owner.nodes = [];
    return `${this.name} detached, ${this.owner.nodes.length} left`;
  }
}
class Holder {
  nodes: (Node2 | undefined)[] = [];
}
const h = new Holder();
h.nodes.push(new Node2("n0", h), undefined, new Node2("n2", h));
console.log("chain", h.nodes[1]?.detach(), h.nodes.length);
console.log("chain", h.nodes[2]?.detach(), h.nodes.length);
console.log("chain", h.nodes[0]?.detach());

// Many reads, so leaked or freed elements would show up under the sanitizers.
let total = 0;
for (let round = 0; round < 500; round++) {
  fill();
  for (let i = 0; i < 8; i++) total += s.describe(i).length + s.readThenMutate(i).length;
  total += s.replaceThenRead(round % 7).length;
}
console.log("total", total, s.items.length);
