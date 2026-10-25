type Key = string | number | boolean | bigint | null | undefined;

const flags = new Map<boolean, string>([[true, "yes"], [false, "no"]]);
flags.set(true, "updated");
console.log("flags", flags.size, flags.get(true), flags.get(false), flags.get(Boolean(0)));
console.log("flag order", [...flags.keys()].join(","), [...new Set([true, false, true])].join(","));
flags.delete(false);
flags.set(false, "again");
console.log("flag values", [...flags.values()].join(","));

function ownKeys(value: object): Set<string | symbol> {
  return new Set(Reflect.ownKeys(value));
}
const propertyKeys = ownKeys({ name: 1 });
const propertySymbol = Symbol("key");
propertyKeys.add(propertySymbol);
propertyKeys.add(Reflect.ownKeys({ other: true })[0]);
console.log("property keys", propertyKeys.size, propertyKeys.has("name"), propertyKeys.has("other"), propertyKeys.has(propertySymbol));

const large = 1n << 160n;
const integers = new Map<bigint, number>([[large, 1], [-large, 2], [0n, 3]]);
integers.set(BigInt(large.toString()), 4);
console.log("integers", integers.size, integers.get(large + 0n), integers.get(-large), integers.has(-0n));
integers.delete(BigInt(large.toString()));
integers.set(large, 5);
console.log("integer order", [...integers.keys()].map(key => key.toString()).join(","));
console.log("integer set", new Set([large, BigInt(large.toString()), -large, 0n]).size);

const values: Key[] = [false, 0, -0, "0", 0n, null, undefined, true, 1, "1", 1n, NaN, Number("nan")];
const mixed = new Map<Key, string>();
for (const value of values) mixed.set(value, typeof value + ":" + String(value));
console.log("mixed", mixed.size, mixed.get(false), mixed.get(0), mixed.get("0"), mixed.get(0n));
console.log("units", mixed.get(null), mixed.get(undefined), mixed.get(NaN));
console.log("mixed order", [...mixed.values()].join(","));
mixed.delete(false);
mixed.set(false, "last");
console.log("reinsert", [...mixed.values()].join(","));
const zeros = new Set<number | boolean>([-0, false]);
for (const value of zeros) console.log("zero", typeof value, typeof value === "number" ? 1 / value : value);

type Item = { value: number };
type IdentityKey = Item | Item[] | string | number | boolean | bigint | null | undefined;
const item: Item = { value: 1 };
const other: Item = { value: 1 };
const array: Item[] = [item];
const identities = new Map<IdentityKey, number>();
identities.set(item, 1);
identities.set(other, 2);
identities.set(array, 3);
identities.set("1", 4);
identities.set(1, 5);
identities.set(1n, 6);
identities.set(null, 7);
identities.set(undefined, 8);
item.value = 10;
array.push(other);
console.log("identities", identities.size, identities.get(item), identities.get(other), identities.get(array));
const independent = new Map(identities);
identities.clear();
console.log("copy owners", independent.get(item), independent.get(other), independent.get(array));

const churn = new Map<number | bigint, number>();
for (let round = 0; round < 4; round++) {
  for (let i = 0; i < 160; i++) { churn.set(i, i); churn.set(BigInt(i), i + 1); }
  for (let i = 0; i < 120; i++) { churn.delete(i); churn.delete(BigInt(i)); }
}
console.log("churn", churn.size, churn.get(159), churn.get(159n), churn.has(1), churn.has(1n));
let visits = 0;
churn.forEach((value, key) => {
  visits++;
  if (visits === 1) { churn.clear(); churn.set(1000n, value); churn.set(1000, value + 1); }
});
console.log("live", visits, [...churn.keys()].map(key => typeof key + ":" + String(key)).join(","));

function checked(map: Map<unknown, unknown>): void {
  console.log("checked reads", map.get(large), map.get(-large), map.has("missing"));
  map.set(large + 0n, 9);
  const copy = new Map(map);
  copy.set("independent key", "independent value");
  console.log("checked copy", copy.size, copy.get("independent key"), map.has("independent key"));
}
const integerView: unknown = integers;
checked(integerView as Map<unknown, unknown>);
console.log("typed sees write", integers.get(large));

const unknownValues: unknown[] = [large, BigInt(large.toString()), -large, "0", 0n, 0, false, null, undefined];
const generic = new Set<unknown>(unknownValues);
console.log("checked set", generic.size, generic.has(large + 0n), generic.has(-large), generic.has(1n));
const boolView: unknown = new Set([true, false]);
const genericCopy = new Set(boolView as Set<unknown>);
genericCopy.add("new type");
console.log("checked copy set", genericCopy.size, genericCopy.has("new type"));
