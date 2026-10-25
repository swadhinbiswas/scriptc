// Object.entries over typed values seen as unknown: required and optional
// record fields, nested containers, class instances, arrays, strings,
// scalars, and nullish receivers.
const entriesOf = (o: unknown): [string, any][] => Object.entries(o as object);
type Point = { x: number; y: number; label?: string; tags?: string[] };
const p: Point = { x: 1, y: 2 };
const q: Point = { x: 3.5, y: -4, label: "q", tags: ["a", "b"] };
console.log(entriesOf(p));
console.log(entriesOf(q));
console.log(entriesOf(q).length, entriesOf(p).length);

for (const [key, value] of entriesOf(q)) {
  console.log(key, typeof value, Array.isArray(value) ? value.join("|") : value);
}

// Values keep their identity: nested containers are the record's own.
type Tagged = { id: number; tags: string[] };
const t: Tagged = { id: 1, tags: ["a", "b"] };
const pairs = entriesOf(t);
console.log(pairs[1]![1] === t.tags, pairs[1]![1] === entriesOf(t)[1]![1]);
(pairs[1]![1] as string[]).push("c");
console.log(t.tags.join(","));

class Box {
  width = 2;
  height = 3;
  area(): number {
    return this.width * this.height;
  }
}
console.log(entriesOf(new Box()));
console.log(entriesOf([5, "six", true]), entriesOf("hey"), entriesOf(42), entriesOf(false));

for (const bad of [null, undefined]) {
  try {
    entriesOf(bad);
  } catch (e) {
    console.log((e as Error).name, (e as Error).message);
  }
}

// The pairs feed ordinary array and collection operations.
const map = new Map(entriesOf(q));
console.log(map.size, map.get("label"), map.get("x"));
console.log(Object.fromEntries(entriesOf(p)));
console.log(
  entriesOf(q)
    .filter(([, v]) => typeof v === "number")
    .map(([k, v]) => `${k}=${v}`)
    .join("&"),
);
console.log(JSON.stringify(entriesOf(q)));
const sorted = entriesOf({ b: 1, a: 2, c: 0 } as unknown).sort((l, r) => l[1] - r[1]);
console.log(sorted);
