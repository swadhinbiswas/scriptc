// JSON.stringify with an array replacer: only the listed keys of every
// object serialize, in the list's order, nested objects included; arrays
// keep all their elements; numbers in the list name keys too; duplicates
// and non-string entries are ignored; toJSON results are filtered after
// conversion; and the space argument still applies.
type Item = { a: number; d: number };
type Value = { a: number; b: { a: number; c: number }; c: (number | Item)[] };
const value: Value = { a: 1, b: { a: 2, c: 3 }, c: [1, { a: 5, d: 6 }] };

console.log(JSON.stringify(value, ["a", "b", "c"]));
console.log(JSON.stringify(value, ["a", "c"], 2));
console.log(JSON.stringify(value, ["c", "a", "c"]));
console.log(JSON.stringify(value, []));

const mixed: (string | number)[] = ["a", 1, "missing"];
console.log(JSON.stringify({ a: 1, 1: "one", b: 2 }, mixed));

const parsed: unknown = JSON.parse('{"z":1,"y":{"z":2,"w":3},"w":[{"z":4,"v":5}]}');
console.log(JSON.stringify(parsed, ["w", "z"]));
console.log(JSON.stringify(parsed, ["y", "w"], "--"));

console.log(JSON.stringify([{ a: 1, b: 2 }, 3, "s"], ["b"]));
console.log(JSON.stringify("text", ["a"]), JSON.stringify(5, ["a"]), JSON.stringify(null, ["a"]));

const optional: string[] | undefined = value.a > 0 ? ["b"] : undefined;
console.log(JSON.stringify({ a: 1, b: 2 }, optional));

class Temperature {
  celsius = 21;
  label = "room";
  toJSON(): unknown {
    return { label: this.label, fahrenheit: this.celsius * 1.8 + 32, celsius: this.celsius };
  }
}
console.log(JSON.stringify({ reading: new Temperature(), skipped: true }, ["reading", "celsius", "label"]));

// The list is read once, before serialization starts.
const names = ["a"];
const growing = { a: { a: 1, b: 2 }, b: 3 };
console.log(JSON.stringify(growing, names), names.length);
const stored: (value: unknown, replacer: string[]) => string = JSON.stringify;
console.log(stored({ keep: 1, drop: 2 }, ["keep"]));
