// A local read from a missing array element is undefined. Object literals
// built from it, in shorthand or long form, through spreads or nested
// records, keep the property with an undefined value, as JSON and
// Object.keys observe. A present element keeps its value.
interface Shape {
  side: number;
}

function sideCount(shape: Shape): number {
  return Object.keys(shape).length;
}

function describe(shape: Shape): string {
  return shape.side === undefined ? "no side" : `side ${shape.side}`;
}

const sides = [3, 4];
const side = sides[99];
const known = sides[1];

console.log(JSON.stringify({ side }), Object.keys({ side }).length, { side });
console.log(JSON.stringify({ side: side }), Object.keys({ side: side }).length, { side: side });
console.log(JSON.stringify({ known }), { known });

// Spreads and nested records.
const base = { side };
console.log({ ...base }, JSON.stringify({ ...base, extra: 1 }), { ...{ side } });
console.log({ outer: { side } }, JSON.stringify({ outer: { side } }));
console.log(JSON.stringify({ outer: { inner: { side } } }));

// Arrays of records and typed parameters.
const shapes = [{ side }, { side: 5 }];
console.log(JSON.stringify(shapes), shapes.length, shapes[0]!.side === undefined);
const holder = { side: side };
console.log(sideCount(holder), describe(holder), describe({ side: known }));

// Annotated records inside a function and a loop.
function report(at: number): void {
  const value = sides[at];
  const shape: Shape = { side: value };
  console.log(describe(shape), JSON.stringify(shape), "side" in shape);
}
report(0);
report(5);
for (const at of [1, 9]) {
  const value = sides[at];
  const shape: Shape = { side: value };
  console.log(JSON.stringify(shape), shape.side);
}

// String elements: a missing name is undefined as well.
const names = ["square"];
const name = names[4];
const tagged = { name, corners: 4 };
console.log(tagged, JSON.stringify(tagged), Object.keys(tagged).join(","));

// A present undefined element and a missing one look the same.
const optional: (number | undefined)[] = [undefined, 2];
const stored = optional[0];
const missing = optional[8];
console.log(JSON.stringify({ stored, missing }), { stored, missing });
console.log(JSON.stringify({ value: optional[1] }), JSON.stringify({ value: optional[3] }));
