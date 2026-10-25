// Values typed as unions that include records or arrays compare by the
// same identity as their unknown views: optional array and record fields,
// nullable locals, and union-typed parameters.
interface Item { name: string; tags?: string[]; parent?: Item; req: string[] }

const root: Item = { name: "root", req: ["r"] };
const item: Item = { name: "item", tags: ["a", "b"], parent: root, req: ["x"] };
const u: any = item;

console.log(u.tags === item.tags, u.req === item.req, u.parent === item.parent);
console.log(u.tags !== item.tags, u.parent !== item.parent);

const tags: string[] | undefined = item.tags;
const parent: Item | undefined = item.parent;
console.log(u.tags === tags, u.parent === parent, u.parent.req === root.req);

const missing: Item = { name: "missing", req: [] };
const m: any = missing;
console.log(m.tags === missing.tags, m.parent === missing.parent, m.tags === undefined);

function matches(value: unknown, candidate: string[] | null): boolean {
  return value === candidate;
}
console.log(matches(u.tags, item.tags ?? null), matches(u.req, null), matches(u.tags, ["a", "b"]));

// Mutation through either side is visible through the other.
item.tags?.push("c");
console.log(u.tags.join(","));
u.tags.push("d");
console.log(item.tags?.join(","));
