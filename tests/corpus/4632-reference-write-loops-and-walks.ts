// Loop element borrows, optional element reads, parent walks and borrowed
// returns in bodies that write the heap: borrowed only while nothing the
// body (or a callee) writes can release the lent value.

class Item {
  name: string;
  parent: Item | undefined;
  note: string | undefined = undefined;
  constructor(name: string, parent: Item | undefined) {
    this.name = name;
    this.parent = parent;
  }
}

function churn(): number {
  let total = 0;
  for (let i = 0; i < 100; i++) total += new Item("c" + i, undefined).name.length;
  return total;
}

// The body writes another field of each element: elements stay lent.
function annotate(items: Item[]): string {
  const names: string[] = [];
  for (const it of items) {
    it.note = "seen:" + it.name;
    names.push(it.name);
  }
  return names.join(",");
}

// The body removes elements from the iterated array: elements are owned.
function drain(items: Item[]): string {
  const names: string[] = [];
  for (const it of items) {
    items.length = 0;
    churn();
    names.push(it.name);
  }
  return names.join(",");
}

// Indexed loop with an optional element read and an unrelated write.
function indexed(items: Item[], log: string[]): string {
  let s = "";
  for (let i = 0; i < items.length + 1; i++) {
    const it = items[i];
    log.push("i" + i);
    s += it === undefined ? "-" : it.name;
  }
  return s;
}

// Indexed loop replacing the element it just read.
function replaceEach(items: Item[]): string {
  let s = "";
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    items[i] = new Item("r" + i, undefined);
    churn();
    s += it === undefined ? "-" : it.name;
  }
  return s;
}

// A parent walk in a body that writes notes: the walk borrows.
function rootWithNotes(it: Item): string {
  let p = it;
  while (p.parent !== undefined) {
    p.note = "walked";
    p = p.parent;
  }
  return p.name;
}

// A walk whose body detaches parents: the walk owns its steps.
function detach(it: Item): string {
  let p = it;
  let s = "";
  while (p.parent !== undefined) {
    const next = p.parent;
    p.parent = undefined;
    churn();
    s += next.name;
    p = next;
  }
  return s;
}

// A borrowed return from a body that writes elsewhere, consumed after a
// call that writes notes.
function topOf(it: Item, log: string[]): Item {
  log.push("top");
  let p = it;
  while (p.parent !== undefined) p = p.parent;
  return p;
}
function useTop(it: Item, log: string[]): string {
  const top = topOf(it, log);
  annotate([it]);
  return top.name + ":" + (it.note ?? "");
}

const chain: Item[] = [];
let prev: Item | undefined = undefined;
for (let i = 0; i < 8; i++) {
  prev = new Item("n" + i, prev);
  chain.push(prev);
}
const log: string[] = [];
console.log(annotate(chain.slice()), chain[3]!.note);
console.log(drain(chain.slice(0, 4)));
console.log(indexed(chain.slice(0, 3), log), log.length);
console.log(replaceEach(chain.slice(0, 3)));
console.log(rootWithNotes(chain[7]!), chain[4]!.note);
console.log(useTop(chain[6]!, log), log.join(""));
console.log(detach(chain[7]!), chain[7]!.parent, chain[2]!.parent);
