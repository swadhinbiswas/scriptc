class Item { value: number; constructor(value: number) { this.value = value; } }
function arrays(values: Item[], item: Item): Item[] {
  values.push(item);
  values.unshift(item);
  values[1] = item;
  const copied = values.slice();
  console.log(copied[0] === item, copied[1] === item, values.reverse() === values);
  values.push(...values);
  const removed = values.splice(1, 1, item);
  console.log(removed[0] === item, values.includes(item), copied.length, values.length);
  values.length = 1;
  return copied;
}
function maps(values: Map<string, Item>, keys: Set<string>, item: Item, key: string): Item {
  values.set(key, item);
  keys.add(key);
  console.log(values.has(key), keys.has(key), values.size);
  const saved = values.get(key)!;
  values.delete(key);
  keys.delete(key);
  console.log(values.size, keys.size, saved === item);
  values.set(key, saved);
  values.clear();
  return saved;
}
function bytes(values: Uint8Array): Uint8Array {
  values.fill(3);
  const view = values.subarray(1);
  values.copyWithin(1, 0, 2);
  view.set(new Uint8Array([7]), 0);
  console.log(values.join(","), view.join(","), values.slice().join(","));
  return view;
}
const item = new Item(11);
console.log(arrays([], item)[1] === item);
console.log(maps(new Map<string, Item>(), new Set<string>(), item, "one") === item);
console.log(bytes(new Uint8Array(3))[0]);

function replacedInput(): void {
  let values = [1, 2];
  const saved = values;
  values.push((values = [9], 7));
  console.log(saved.join(","), values.join(","));
  let map = new Map<string, number>();
  const old = map;
  map.set((map = new Map<string, number>(), "key"), 5);
  console.log(old.get("key"), map.size);
  let data = new Uint8Array([1, 2]);
  const original = data;
  data.fill((data = new Uint8Array([8]), 4));
  console.log(original.join(","), data.join(","));
}
replacedInput();

function failure(values: Item[], item: Item): Item {
  try {
    values.push(item);
    throw new Error("stop");
  } finally {
    values.length = 0;
    console.log(item.value);
  }
}
try { failure([], new Item(17)); } catch (error) { console.log(error instanceof Error && error.message); }

function chainedSet(): void {
  const map = new Map<string, number>();
  console.log(map.set("a", 1).set("b", 2) === map, map.size);
  (map.set("c", 3));
  console.log(map.get("c"));
}
chainedSet();
