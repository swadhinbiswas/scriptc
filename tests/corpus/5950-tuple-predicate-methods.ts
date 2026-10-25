// filter, find, findIndex, some and every on fixed tuples, readonly and
// mutable: each position is read when it is visited, find/findIndex/some/
// every stop at the first deciding position, and results match arrays.
export {};

const tools = ["read", "write", "search"] as const;
const allowed: string[] = ["read", "search"];
console.log(JSON.stringify(tools.filter((name) => allowed.includes(name))));
console.log(tools.find((name) => name.startsWith("w")), tools.find((name) => name === allowed[5]));
console.log(tools.findIndex((name) => name === "search"), tools.findIndex((name) => name.length > 9));
console.log(tools.some((name) => name.length > 5), tools.some((name) => name.length > 9));
console.log(tools.every((name) => name.length > 3), tools.every((name) => name.length > 4));
console.log(tools.filter((_, index) => index !== 1).join(","));

// Mixed element types, with and without inferred narrowing.
const mixed: readonly [number, string, boolean, number] = [7, "eight", true, 0];
console.log(JSON.stringify(mixed.filter((value): boolean => typeof value !== "boolean")));
const numbers = mixed.filter((value) => typeof value === "number");
console.log(numbers.reduce((sum, value) => sum + value, 0), numbers.length);
const text = mixed.find((value) => typeof value === "string");
console.log(text === undefined ? "none" : text.toUpperCase());
console.log(mixed.findIndex((value) => value === true), mixed.some((value) => value === "eight"));
console.log(mixed.every((value) => typeof value !== "object"));

// Truthiness of non-boolean predicate results, and Boolean.
const counts: [number, number, number] = [0, 3, 0];
console.log(counts.filter((value) => value).join(","), counts.findIndex((value) => value));
console.log(counts.some((value) => value), counts.every((value) => value));
const labels: [string, string, string] = ["", "b", "c"];
console.log(labels.filter(Boolean).join(","), labels.find((value) => value));
const maybe: [string | undefined, string | undefined] = [undefined, "x"];
console.log(JSON.stringify(maybe.filter(Boolean)), maybe.findIndex((value) => value));

// A single-element tuple.
const single: [number] = [4];
console.log(JSON.stringify(single.filter((value) => value > 4)), single.find((value) => value === 4));

// A callback's write to a later position is visible when it is visited;
// filter and find keep the value read before the callback ran.
const mutable: [number, number, number] = [1, 2, 3];
console.log(mutable.filter((value, index) => {
  if (index === 0) mutable[1] = 20;
  if (index === 1) mutable[1] = 200;
  return value > 1;
}).join(","), mutable.join(","));
const slots: [number, number] = [5, 6];
console.log(slots.find((value) => {
  slots[0] = 50;
  return value === 5;
}), slots[0]);
const later: [number, number, number] = [1, 2, 3];
console.log(later.some((value, index) => {
  if (index === 0) later[2] = 30;
  return value === 30;
}));

// Reference identity of kept and found elements.
const a = { id: "a" };
const b = { id: "b" };
const objects: [typeof a, typeof b] = [a, b];
const kept = objects.filter((value) => value.id === "b");
const found = objects.find((value) => value.id === "a");
console.log(kept[0] === b, found === a);
b.id = "B";
console.log(kept[0]!.id);

// Short-circuiting and visit order.
let visited = "";
const letters = ["p", "q", "r"] as const;
console.log(letters.find((value) => { visited += value; return value === "q"; }), visited);
visited = "";
console.log(letters.findIndex((value) => { visited += value; return value === "p"; }), visited);
visited = "";
console.log(letters.some((value) => { visited += value; return value === "q"; }), visited);
visited = "";
console.log(letters.every((value) => { visited += value; return value === "p"; }), visited);
visited = "";
console.log(letters.filter((value) => { visited += value; return true; }).length, visited);

// The receiver evaluates before the callback expression.
let calls = "";
function receiver(): [number, number] { calls += "R"; return [8, 9]; }
function predicate(): (value: number) => boolean {
  calls += "C";
  return (value) => { calls += String(value); return value === 9; };
}
console.log(receiver().filter(predicate()).join(","), calls);
calls = "";
console.log(receiver().find(predicate()), calls);

// A throwing callback stops the visit.
visited = "";
try {
  letters.filter((value, index) => {
    visited += value;
    if (index === 1) throw new Error("stop");
    return true;
  });
} catch (error) {
  if (error instanceof Error) console.log(error.message, visited);
}

// Generic consumers.
function firstMatch<T>(value: T, other: T): T | undefined {
  const pair: [T, T] = [value, other];
  return pair.find((item) => item === other);
}
function anyEqual<T>(value: T, other: T): boolean {
  const pair: readonly [T, T] = [value, other];
  return pair.some((item, index) => index > 0 && item === value);
}
console.log(firstMatch(1, 2), firstMatch("x", "y"), anyEqual(3, 3), anyEqual("u", "v"));
