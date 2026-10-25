// Objects reached through a union keep their identity as weak collection
// keys: the same object is found again, while an equal copy is not.
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; side: number }
  | number[];

const shapes: Shape[] = [{ kind: "circle", radius: 1 }, { kind: "square", side: 2 }, [3, 4]];
const visited = new WeakSet<object>();
const labels = new WeakMap<object, string>();

function visit(shape: Shape): boolean {
  if (visited.has(shape)) return false;
  visited.add(shape);
  return true;
}

for (const shape of shapes) console.log(visit(shape), visit(shape));
shapes.forEach((shape, index) => labels.set(shape, `shape-${index}`));
console.log(shapes.map((shape) => labels.get(shape)).join(" "));

const first = shapes[0]!;
const copy: Shape = { kind: "circle", radius: 1 };
console.log("copy", visited.has(copy), labels.get(copy));

const square = shapes[1]!;
if (!Array.isArray(square) && square.kind === "square") console.log("narrowed", labels.get(square));
const untyped: unknown = shapes[2];
console.log("untyped", labels.get(untyped as object));

console.log("delete", visited.delete(first), visited.has(first), visited.delete(first));
try {
  labels.set(7 as unknown as object, "seven");
} catch (error) {
  console.log((error as Error).name, (error as Error).message);
}
