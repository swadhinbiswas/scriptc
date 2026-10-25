// Objects and arrays from JSON.parse: every small size and the sizes
// around their growth steps, wide objects, duplicate keys, trees parsed
// again after earlier ones were dropped, properties and elements added and
// deleted after parsing, and prototypes and symbol properties set on parsed
// objects.

function show(value: unknown): string {
  return JSON.stringify(value);
}

// Objects and arrays of sizes around the growth steps.
for (const n of [0, 1, 3, 4, 5, 8, 9, 31, 32, 33, 70]) {
  const fields: string[] = [];
  const items: string[] = [];
  for (let i = 0; i < n; i++) {
    fields.push(`"k${i}": ${i % 3 === 0 ? `"s${i}"` : i % 3 === 1 ? i * 1.5 : `[${i}, "x"]`}`);
    items.push(i % 2 ? `"v${i}"` : `${i}`);
  }
  const obj = JSON.parse(`{${fields.join(",")}}`) as Record<string, unknown>;
  const arr = JSON.parse(`[${items.join(",")}]`) as unknown[];
  const keys = Object.keys(obj);
  console.log(n, keys.length, keys[0] ?? "-", keys[keys.length - 1] ?? "-", arr.length, show(arr.slice(-2)));
  // Growing a parsed (fitted) object and array again.
  obj.extra = 1;
  obj[`k${n}`] = "added";
  arr.push("pushed", 42);
  console.log(" grown", Object.keys(obj).length, obj.extra, obj[`k${n}`], arr.length, show(arr[arr.length - 1]));
  if (n > 2) {
    delete obj.k1;
    console.log(" deleted", Object.keys(obj).length, "k1" in obj, show(obj.k2));
  }
}

// Duplicate keys keep the first position and the last value.
const dup = JSON.parse('{"a": 1, "b": 2, "a": 3, "c": {"x": 1, "x": [1, 2]}}') as Record<string, unknown>;
console.log(show(dup), Object.keys(dup).join(","));

// Parse, drop and parse again: recycled objects and arrays.
let total = 0;
for (let round = 0; round < 50; round++) {
  const text = JSON.stringify({ id: round, name: `n${round}`, tags: ["a", "b", round], nested: { v: round / 2, w: [round] } });
  const value = JSON.parse(text) as { id: number; name: string; tags: unknown[]; nested: { v: number; w: number[] } };
  total += value.id + value.tags.length + value.nested.v + value.nested.w[0]!;
  if (round % 10 === 0) console.log("round", round, show(value));
}
console.log("total", total);

// Prototypes and symbol properties on objects.
const proto = { greet(): string { return "hi"; } };
const target = JSON.parse('{"x": 1}') as Record<string, unknown>;
Object.setPrototypeOf(target, proto);
console.log((target as unknown as { greet(): string }).greet(), Object.getPrototypeOf(target) === proto);
const sym = Symbol("tag");
const holder = JSON.parse('{"y": 2}') as object;
Object.defineProperty(holder, sym, { value: "symbol value", enumerable: true });
console.log(String(Reflect.get(holder, sym)), Object.getOwnPropertySymbols(holder).length, show(holder));
