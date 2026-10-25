// Typed records and arrays used as prototypes of objects seen as
// `unknown`: Object.setPrototypeOf and Object.create accept them, reads
// fall through to their fields, later native writes to the prototype stay
// visible, getPrototypeOf returns the same object, and cycles are refused.
type Point = { x: number; y: number; label: string };
type Defaults = { color: string; size: number; tags: string[] };

const defaults: Defaults = { color: "red", size: 1, tags: ["a"] };
const point = { x: 1, y: 2, label: "p" } as Point as unknown as Record<string, unknown>;
Object.setPrototypeOf(point, defaults);
console.log("inherited", point.color, point.size, JSON.stringify(point.tags), point.x);
console.log("identity", Object.getPrototypeOf(point) === defaults, Object.getPrototypeOf(point) === (defaults as unknown));
console.log("in", "color" in point, "x" in point, "toString" in point, "missing" in point);
console.log("own", Object.hasOwn(point, "color"), Object.hasOwn(point, "x"));
console.log("keys", Object.keys(point).join(","), JSON.stringify(point));
const walked: string[] = [];
for (const key in point) walked.push(key);
console.log("for-in", walked.join(","));

// Native writes to the prototype record are seen through the chain.
defaults.color = "blue";
defaults.tags.push("b");
console.log("live", point.color, JSON.stringify(point.tags));

// A write through the object shadows the prototype field.
point.color = "green";
console.log("shadow", point.color, defaults.color, Object.keys(point).join(","));

// Object.create over a typed record, and a chain of two typed records.
const created = Object.create(defaults) as Record<string, unknown>;
console.log("create", created.size, Object.getPrototypeOf(created) === defaults, Object.keys(created).length);
const base: Point = { x: 0, y: 0, label: "origin" };
const middle = { color: "m", size: 2, tags: [] } as Defaults as unknown as Record<string, unknown>;
Object.setPrototypeOf(middle, base);
const leaf = Object.create(middle) as Record<string, unknown>;
console.log("chain", leaf.color, leaf.label, "x" in leaf, leaf.missing);

// A typed array as a prototype.
const items: string[] = ["zero", "one"];
const arrayLike = Object.create(items) as Record<string, unknown>;
console.log("array proto", arrayLike[0], arrayLike.length, "push" in arrayLike);

// Cycles through typed records are refused like Node.
try {
  Object.setPrototypeOf(defaults, point);
  console.log("cycle", "accepted");
} catch (error) {
  console.log("cycle", (error as Error).name, (error as Error).message);
}
console.log("after", point.size, Object.getPrototypeOf(point) === defaults);
