// Iteration reads every key and value kind the static walk loads inline:
// number, string and boolean keys; number, boolean, string and object
// values; and object keys, which keep their identity.
interface Item {
  name: string;
  count: number;
}
const byName = new Map<string, Item>();
for (const name of ["pear", "fig", "apple", "kiwi"]) byName.set(name, { name, count: name.length });
byName.delete("fig");
let total = 0;
for (const [name, item] of byName) {
  item.count++;
  total += item.count;
  console.log(name, item.name, item.count);
}
console.log("total", total, byName.get("pear")!.count);

const flags = new Map<boolean, number>([
  [true, 1],
  [false, 0],
]);
for (const [k, v] of flags) console.log(typeof k, k, v);

const marks = new Map<number, boolean>();
for (let i = 0; i < 6; i++) marks.set(i * 0.5, i % 2 === 0);
marks.delete(0);
for (const [k, v] of marks) console.log(k, v);

const labels = new Map<number, string>([
  [-0, "zero"],
  [NaN, "nan"],
  [2 ** 40, "big"],
]);
for (const [k, v] of labels) console.log(Object.is(k, -0), k, v);

const owners = new Map<Item, string>();
const items: Item[] = [
  { name: "a", count: 1 },
  { name: "b", count: 2 },
  { name: "c", count: 3 },
];
for (const item of items) owners.set(item, item.name.toUpperCase());
owners.delete(items[0]!);
for (const [item, owner] of owners) console.log(item === items[1] || item === items[2], item.name, owner);
const keys = [...owners.keys()];
console.log(keys[0] === items[1], keys[1] === items[2]);
