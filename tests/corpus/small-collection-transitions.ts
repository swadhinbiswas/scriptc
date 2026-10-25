const map = new Map<number, string>([[0, "zero"], [1, "one"], [2, "two"], [3, "three"]]);
for (let i = 0; i < 12; i++) {
  map.delete(3);
  map.set(3, String(i));
}
const copy = new Map(map);
const iterator = map.entries();
console.log(iterator.next().value);
map.delete(1);
for (let i = 4; i < 20; i++) map.set(i, String(i));
console.log(Array.from(iterator), Array.from(copy));
const live = copy.keys();
console.log(live.next().value);
copy.clear();
for (let i = 20; i < 27; i++) {
  copy.clear();
  copy.set(i, String(i));
}
console.log(Array.from(live), Array.from(copy));

const first = { value: 1 };
const second = { value: 1 };
const identities = new Map<object, string>([[first, "first"], [second, "second"]]);
const kept = new Map(identities);
identities.set(first, "changed");
for (let i = 0; i < 8; i++) identities.set({ value: i }, String(i));
identities.delete(second);
console.log(identities.get(first), identities.has(second), kept.get(first), kept.get(second));
const numbers = new Set([NaN, -0, 1, 2]);
console.log(numbers.has(NaN), numbers.has(0), Array.from(numbers));
numbers.delete(NaN);
for (let i = 3; i < 12; i++) numbers.add(i);
numbers.add(NaN);
console.log(Array.from(numbers));

class Link {
  children = new Map<string, Link>();
  value: number;
  constructor(value: number) { this.value = value; }
}
for (let round = 0; round < 80; round++) {
  const root = new Link(round);
  root.children.set("self", root);
  const copy = new Map(root.children);
  for (let i = 0; i < 8; i++) root.children.set(String(i), new Link(i));
  root.children.clear();
  if (round === 79) console.log(copy.get("self")!.value);
}
