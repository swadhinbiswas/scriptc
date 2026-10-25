// Object.keys over values seen as unknown: typed records, optional
// fields, arrays, strings, nullish receivers, and independent results.
const keysOf = (o: unknown): string[] => Object.keys(o as object);
type Point = { x: number; y: number; label?: string };
const p: Point = { x: 1, y: 2 };
const q: Point = { x: 3, y: 4, label: "q" };
console.log(keysOf(p).join(","), keysOf(q).join(","), keysOf(p).length + keysOf(q).length);
console.log(keysOf([5, 6, 7]).join(","), keysOf("hey").join(","), keysOf(42).length, keysOf(true).length);
console.log(keysOf({ b: 1, "3": 2, a: 3, "1": 4 }).join(","));

// Each call returns a new array the caller may change.
const first = keysOf(p);
first.push("added");
first[0] = "changed";
console.log(first.join(","), keysOf(p).join(","), keysOf({ ...p }).join(","));
const sorted = keysOf(q).sort();
console.log(sorted.join(","), keysOf(q).join(","));

for (const bad of [null, undefined]) {
  try {
    keysOf(bad);
  } catch (e) {
    console.log((e as Error).name, (e as Error).message);
  }
}

// Keys feed ordinary string operations.
const joined = keysOf(q)
  .map((k) => k.toUpperCase())
  .filter((k) => k !== "Y")
  .join("-");
console.log(joined, keysOf(q).includes("label"), keysOf(q).indexOf("y"));

class Box {
  width = 2;
  height = 3;
}
console.log(keysOf(new Box()).join(","));
