// JSON.stringify over typed records and arrays seen as `unknown`: nested
// records, absent optional fields, holes, a `toJSON` field, indentation,
// a replacer function, a replacer that mutates the value it is walking,
// and cycles through the native graph.
type Leaf = { id: number; name: string; note?: string };
type Branch = { id: number; leaves: Leaf[]; parent?: Branch; tags: (string | undefined)[] };
type Stamped = { at: number; toJSON: (key: string) => string };

const leaves: Leaf[] = [{ id: 1, name: "a" }, { id: 2, name: "b", note: "n" }];
const branch: Branch = { id: 10, leaves, tags: ["x", undefined, "z"] };
const view: unknown = branch;

console.log(JSON.stringify(view));
console.log(JSON.stringify(view, null, 2));
console.log(
  JSON.stringify(view, (key, value) => (typeof value === "number" ? value * 100 : key === "note" ? undefined : value)),
);

// A replacer that changes the record while it is being serialized.
const seen: string[] = [];
console.log(
  JSON.stringify(view, function (this: unknown, key, value) {
    seen.push(key);
    if (key === "id" && typeof value === "number" && value === 1) leaves[1]!.name = "changed";
    if (key === "leaves") leaves.push({ id: 3, name: "late" });
    return value;
  }),
);
console.log("visited", seen.join("|"));
leaves.length = 2;

// Holes and present undefined elements.
const sparse: number[] = [1, 2, 3, 4];
sparse.length = 6;
sparse.copyWithin(1, 5, 6);
const sparseView: unknown = sparse;
console.log(JSON.stringify(sparseView), JSON.stringify({ list: sparseView }));

// A record field named toJSON converts the record.
const stamped: Stamped = { at: 5, toJSON: (key) => `stamp(${key})` };
const stampedView: unknown = { first: stamped, list: [stamped] };
console.log(JSON.stringify(stampedView));

// Child capsules read twice keep identity; after a checked-view write the
// next stringify sees the new field.
const object = view as Record<string, unknown>;
console.log(object.leaves === object.leaves, JSON.stringify(object.leaves));
object.extra = { deep: true };
console.log(JSON.stringify(view));

// A cycle through the native graph is a TypeError, as in Node.
const child: Branch = { id: 11, leaves: [], tags: [] };
const root: Branch = { id: 12, leaves: [], parent: child, tags: [] };
child.parent = root;
try {
  JSON.stringify(root as unknown);
  console.log("no cycle error");
} catch (error) {
  console.log("cycle", (error as Error).name);
}
