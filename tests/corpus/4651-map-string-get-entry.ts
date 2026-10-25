// String-keyed Map.get of reference values reads the entry and retains the
// value with its static type's retain. Results must outlive the entry: they
// survive delete, overwrite, clear and the map itself, for class instances,
// records, arrays, nested maps, cyclic objects and union-typed values, with
// literal, computed and sliced keys.
class Node {
  name: string;
  next: Node | undefined = undefined;
  constructor(name: string) {
    this.name = name;
  }
}

interface Box {
  label: string;
  items: number[];
}

const nodes = new Map<string, Node>();
for (let i = 0; i < 20; i++) nodes.set("n" + i, new Node("node-" + i));
const a = nodes.get("n3");
const b = nodes.get("n" + (1 + 2) * 4);
const missing = nodes.get("nope");
console.log(a?.name, b?.name, missing === undefined);
nodes.delete("n3");
nodes.set("n12", new Node("replacement"));
console.log("after delete/overwrite:", a?.name, b?.name, nodes.get("n12")?.name);

// A cycle through the map value and the result.
const ring = new Map<string, Node>();
const first = new Node("first");
const second = new Node("second");
first.next = second;
second.next = first;
ring.set("first", first);
ring.set("second", second);
const viaMap = ring.get("second");
ring.clear();
console.log("cycle:", viaMap?.next?.next?.name, ring.size);

// Records and arrays as values; keys sliced from a larger string.
const boxes = new Map<string, Box>();
const source = "alpha,beta,gamma";
for (const part of source.split(",")) boxes.set(part, { label: part.toUpperCase(), items: [part.length] });
const keyed = boxes.get(source.slice(6, 10));
boxes.set("beta", { label: "B2", items: [] });
console.log("box:", keyed?.label, keyed?.items.join("|"), boxes.get("beta")?.label);
const lists = new Map<string, number[]>([["evens", [0, 2, 4]], ["odds", [1, 3]]]);
const evens = lists.get("evens");
lists.delete("evens");
evens?.push(6);
console.log("array:", evens?.join(","), lists.has("evens"));

// Maps as values: the inner map outlives its entry in the outer one.
const outer = new Map<string, Map<string, Node>>();
outer.set("inner", new Map<string, Node>([["x", new Node("inner-x")]]));
const inner = outer.get("inner");
outer.delete("inner");
inner?.set("y", new Node("inner-y"));
console.log("nested:", inner?.get("x")?.name, inner?.get("y")?.name, outer.size);

// Union-typed values: nullable instances and mixed arms.
const maybe = new Map<string, Node | null>();
maybe.set("set", new Node("present"));
maybe.set("null", null);
const present = maybe.get("set");
const isNull = maybe.get("null");
const absent = maybe.get("absent");
maybe.delete("set");
console.log("nullable:", present?.name, isNull === null, absent === undefined);
const mixed = new Map<string, Node | string>();
mixed.set("node", new Node("mixed-node"));
mixed.set("text", "plain");
const m1 = mixed.get("node");
const m2 = mixed.get("text");
mixed.set("node", "overwritten");
console.log("mixed:", typeof m1 === "string" ? m1 : m1?.name, m2, mixed.get("node"));

// Many lookups through a growing map (linear scan, then buckets), keeping
// every result alive past the map.
function collect(): Node[] {
  const table = new Map<string, Node>();
  const out: Node[] = [];
  for (let i = 0; i < 64; i++) {
    table.set(`k${i}`, new Node(`v${i}`));
    const back = table.get(`k${Math.floor(i / 2)}`);
    if (back !== undefined) out.push(back);
  }
  return out;
}
const kept = collect();
console.log("kept:", kept.length, kept[0]!.name, kept[63]!.name);

// A result held in a local across a loop that rewrites the entry.
const counters = new Map<string, Box>();
counters.set("c", { label: "start", items: [] });
const held = counters.get("c")!;
for (let i = 0; i < 5; i++) counters.set("c", { label: "round" + i, items: [i] });
console.log("held:", held.label, counters.get("c")?.label);
