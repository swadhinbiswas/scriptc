// console.table: arrays and records of records (columns in first-seen
// order with integer-like keys first, absent properties blank),
// primitive rows (the Values column), arrays of arrays, the properties
// filter, cell rendering (depth 0, objects with more than two keys as
// [Object], at most three array items, single-line strings, wide
// characters), empty tables, primitives printed like log, and tables
// inside a group.
type Row = { name: string; qty?: number; tags?: string[]; meta?: { a: number; b?: number; c?: number } };

const rows: Row[] = [
  { name: "apple", qty: 3, tags: ["red", "fruit"] },
  { name: "banana", tags: ["yellow", "fruit", "long", "curved"] },
  { name: "cherry", qty: 12, meta: { a: 1 } },
  { name: "durian", meta: { a: 1, b: 2, c: 3 } },
];
console.table(rows);
console.table(rows, ["qty", "name", "missing"]);
console.table(rows, []);

const mixed: (string | number | boolean | null)[] = ["text", 1.5, -0, true, null];
console.table(mixed);

console.table([
  [1, 2, 3],
  [4, 5],
  [6, 7, 8, 9],
]);

const byKey: Record<string, { x: number; y?: string }> = {
  b: { x: 1 },
  "2": { x: 2, y: "two" },
  a: { x: 3, y: "it's" },
  "1": { x: 4 },
};
console.table(byKey);

const keyed: Record<string, number> = { z: 1, "10": 2, "9": 3, y: 4 };
console.table([keyed, { q: 5 }]);

console.table([
  { text: "line one\nline two", wide: "日本語", empty: "" },
  { text: "a".repeat(30), wide: "ascii", empty: "x" },
]);
console.table([{ nested: [[1, 2], { k: [3] }, [], {}] }, { nested: [] }]);
console.table([{ flag: false, none: null, num: 1e21, neg: -1.25 }]);

const nothing: { a: number }[] = [];
console.table(nothing);
console.table({});
console.table(5);
console.table("a string");
console.table(true);
console.table(null);
console.table(undefined);
console.table();

console.group("grouped");
console.table([{ inside: "group" }]);
console.groupEnd();
console.log("done");
