class Item {
  label: string;
  constructor(label: string) { this.label = label; }
}
function keep(item: Item, output: Item[]): Item { output.push(item); return item; }
function relay(item: Item, output: Item[], depth: number): Item {
  return depth === 0 ? keep(item, output) : relay(item, output, depth - 1);
}
function work(): void {
  let item = new Item("original");
  let output: Item[] = [];
  const result = relay(item, output, 3);
  result.label = "shared";
  console.log(result === item, output[0] === item, output[0].label);
  const callback: (item: Item, output: Item[]) => Item = keep;
  console.log(callback(item, output) === item, output.length);
}
work();

let current = new Item("before");
function replace(): Item[] { current = new Item("after"); return []; }
const previous = keep(current, replace());
console.log(previous.label, current.label, previous === current);
function localSnapshot(): void {
  let local = new Item("left");
  const saved = keep(local, (local = new Item("right"), []));
  console.log(saved.label, local.label, saved === local);
}
localSnapshot();

class Holder {
  item: Item;
  constructor(item: Item) { this.item = item; }
}
function swap(holder: Holder): Item[] { holder.item = new Item("replaced"); return []; }
function fieldSnapshot(): void {
  const holder = new Holder(new Item("field"));
  const saved = keep(holder.item, swap(holder));
  console.log(saved.label, holder.item.label);
}
fieldSnapshot();

function update(item: Item): Item { item = new Item(item.label + "!"); return item; }
const source = new Item("source");
console.log(update(source).label, source.label);
function captured(item: Item): () => Item { return () => item; }
console.log(captured(new Item("captured"))().label);

class Base { keep(item: Item): Item { return item; } }
class Child extends Base { keep(item: Item): Item { item.label += "!"; return item; } }
function virtual(receiver: Base, item: Item): boolean { return receiver.keep(item) === item; }
console.log(virtual(new Base(), source), virtual(new Child(), source), source.label);

function aliases(item: Item): Item {
  const a = item;
  const b = a;
  try { return b; } finally { console.log(a === item, b === a); }
}
function aliasSnapshot(item: Item): Item {
  const saved = item;
  item = new Item("new local");
  console.log(item.label, saved.label);
  return saved;
}
console.log(aliases(new Item("alias")).label, aliasSnapshot(new Item("saved")).label);
function closureAlias(): () => string {
  const owned = new Item("later");
  const alias = owned;
  return () => alias.label;
}
console.log(closureAlias()());
function loopAliases(): void {
  for (let i = 0; i < 3; i++) {
    const owned = new Item(String(i));
    const alias = owned;
    if (i === 1) continue;
    console.log(alias.label);
  }
}
loopAliases();
