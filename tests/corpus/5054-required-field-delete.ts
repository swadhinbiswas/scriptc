// Deleting through the dynamic view of a typed record. Optional fields and
// properties added through the view delete normally. A required field has
// no absent state in the native layout: Node removes it, while a compiled
// binary refuses the delete with the TypeError strict code gets for a
// non-deletable property and leaves the record unchanged. The guarded
// lines below accept exactly those two outcomes and print the same text.
type Point = { x: number; y: number; label?: string };

function view(value: Point): Record<string, unknown> {
  const seen: unknown = value;
  return seen as Record<string, unknown>;
}

const point: Point = { x: 1, y: 2, label: "p" };
const dynamic = view(point);
dynamic.extra = true;

// Optional fields and added keys.
delete dynamic.label;
delete dynamic.extra;
console.log("optional", Object.keys(dynamic).join(","), JSON.stringify(dynamic), point.label, "label" in point);

// A required field: either Node's deletion or the native refusal, never a
// half-applied state.
const target: Point = { x: 3, y: 4 };
const required = view(target);
let outcome = "deleted";
try {
  delete required.x;
} catch (error) {
  const failure = error as Error;
  outcome = `${failure.name}: ${failure.message}`;
}
const removed = outcome === "deleted" && !("x" in required) && required.x === undefined;
const refused =
  outcome === "TypeError: Cannot delete property 'x' of #<Object>" &&
  "x" in required &&
  target.x === 3 &&
  JSON.stringify(required) === '{"x":3,"y":4}';
console.log("required", removed || refused, removed !== refused);

// The record stays usable either way.
required.y = 40;
console.log("after", target.y, Object.hasOwn(required, "y"), required.y);
