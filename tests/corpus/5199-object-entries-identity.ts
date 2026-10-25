// Object.entries over values typed any keeps Node's key order and value
// identity across records, JSON objects, and arrays, and each call
// answers fresh rows.
type Node = { name: string; children: Node[]; meta?: Record<string, number> };
const leaf: Node = { name: "leaf", children: [] };
const root: Node = { name: "root", children: [leaf], meta: { depth: 0 } };

function describe(value: any, depth = 0): string[] {
  const out: string[] = [];
  for (const [key, item] of Object.entries(value)) {
    const pad = " ".repeat(depth * 2);
    if (item !== null && typeof item === "object") {
      out.push(`${pad}${key}:`);
      out.push(...describe(item, depth + 1));
    } else out.push(`${pad}${key}=${String(item)}`);
  }
  return out;
}
console.log(describe(root).join("\n"));
console.log(describe(JSON.parse('{"9":1,"x":{"1":2,"0":3},"y":[4,{"z":5}]}')).join("\n"));

const a: any = root;
const first = Object.entries(a);
const second = Object.entries(a);
console.log(first !== second, first[0] !== second[0], first[1]![1] === second[1]![1]);
console.log(first[1]![1] === root.children, Object.values(a)[1] === root.children);
first[0]![0] = "renamed";
console.log(first[0], second[0], Object.keys(a)[0]);

const counts = new Map<string, number>();
for (let i = 0; i < 3; i++)
  for (const [k, v] of Object.entries({ a: i, b: i * 2 } as any))
    counts.set(k, (counts.get(k) ?? 0) + (v as number));
console.log([...counts]);
