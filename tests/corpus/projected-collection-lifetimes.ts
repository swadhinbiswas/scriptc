class Item {
  value: number;
  constructor(value: number) { this.value = value; }
}
class State {
  items = new Map<string, Item>();
  keys = new Set<string>();
  numbers = [3, 5, 7];
  words = new Uint32Array([11, 13, 17]);
  constructor(value: number) { this.items.set("key", new Item(value)); }
}
class Root {
  state: State;
  constructor(value: number) { this.state = new State(value); }
}
let root = new Root(7);
function choose(first: string, second: string, flag: boolean): string {
  let key = first;
  if (flag) key = second;
  return key;
}
const payload = new Item(19);
root.state.items.set(choose("other", "key", true), payload);
root.state.keys.add(choose("other", "key", true));
console.log(root.state.items.get(choose("other", "key", true))!.value);
console.log(root.state.keys.has("key"), root.state.numbers[1], root.state.words[2]);
console.log(root.state.items.delete("absent"), root.state.keys.delete("key"));
root.state.items.clear();
console.log(root.state.items.size, payload.value);

function replaceKey(): string {
  root.state = new State(91);
  return "key";
}
root = new Root(23);
console.log(root.state.items.get(replaceKey())!.value, root.state.items.get("key")!.value);
const old = root.state;
function replaceValue(): Item {
  root.state = new State(101);
  return payload;
}
root.state.items.set("key", replaceValue());
console.log(old.items.get("key")!.value, root.state.items.get("key")!.value);
function failure(): string { throw new Error("key failed"); }
try { root.state.items.get(failure()); } catch (error) {
  console.log((error as Error).message, root.state.items.size);
}

function keepElement(items: Item[], replacement: Item[]): number {
  const first = items[0];
  items = replacement;
  return first.value + items[0].value;
}
console.log(keepElement([new Item(31)], [new Item(37)]));
function clearThenThrow(items: Item[]): number {
  items.length = 0;
  throw new Error("cleared");
}
function inspect(item: Item, extra: number): number { return item.value + extra; }
const array = [new Item(41)];
try { inspect(array[0], clearThenThrow(array)); } catch (error) {
  console.log((error as Error).message, array.length);
}
