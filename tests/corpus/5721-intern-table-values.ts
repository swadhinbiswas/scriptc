import { InternTable } from "@scriptc/experimental";

// InternTable value types: records, arrays, Maps, Sets, unions, nullable
// and optional values, scalars and checked values. Stored values are
// published, so writes into them throw Node's frozen-object TypeErrors,
// and values that cannot be published are refused before anything is
// stored. Node.js prints the same.

function attempt(what: string, write: () => void): void {
  try {
    write();
    console.log(what, "wrote");
  } catch (e) {
    console.log(what, (e as Error).name, (e as Error).message);
  }
}

type Span = { pos: number; end: number; tags: string[] };
const spans = new InternTable<string, Span>("values.spans");
const span = spans.getOrInsertComputed("s", () => ({ pos: 1, end: 4, tags: ["a", "b"] }));
console.log(span.pos, span.end, span.tags.join("+"), spans.get("s") === span);
attempt("record field", () => {
  span.pos = 2;
});
attempt("record array", () => {
  span.tags.push("c");
});

const lists = new InternTable<number, number[]>("values.lists");
const list = lists.getOrInsert(1, [3, 1, 2]);
console.log(list.length, list[0], lists.get(1)?.[2], lists.get(2)?.[0]);
attempt("array index", () => {
  list[0] = 9;
});
attempt("array sort", () => {
  list.sort();
});
console.log([...list].sort().join(","));

const maps = new InternTable<string, Map<string, number>>("values.maps");
const map = maps.getOrInsertComputed("m", () => new Map([["x", 1], ["y", 2]]));
console.log(map.get("x"), map.size, [...map.keys()].join(","));
attempt("map set", () => {
  map.set("z", 3);
});
const sets = new InternTable<string, Set<number>>("values.sets");
const set = sets.getOrInsert("s", new Set([1, 2, 2, 3]));
console.log(set.size, set.has(2), set.has(4));
attempt("set add", () => {
  set.add(4);
});

class Leaf {
  readonly value: number;
  constructor(value: number) {
    this.value = value;
  }
}
class Pair {
  readonly left: Node;
  readonly right: Node;
  constructor(left: Node, right: Node) {
    this.left = left;
    this.right = right;
  }
}
type Node = Leaf | Pair;
const nodes = new InternTable<string, Node>("values.nodes");
function leaf(v: number): Node {
  return nodes.getOrInsertComputed(`leaf:${v}`, () => new Leaf(v));
}
function pair(l: Node, r: Node, key: string): Node {
  return nodes.getOrInsertComputed(key, () => new Pair(l, r));
}
const tree = pair(leaf(1), pair(leaf(2), leaf(1), "p2"), "p1");
function sum(n: Node): number {
  return n instanceof Leaf ? n.value : sum(n.left) + sum(n.right);
}
console.log(sum(tree), nodes.size, tree instanceof Pair, (tree as Pair).right instanceof Pair);
console.log(leaf(1) === ((tree as Pair).left as Leaf), nodes.get("p2") === (tree as Pair).right);

const nullable = new InternTable<string, Leaf | null>("values.nullable");
console.log(nullable.getOrInsert("none", null), nullable.has("none"), nullable.get("none"), nullable.get("other"));
console.log(nullable.getOrInsert("one", new Leaf(1))?.value);

const optional = new InternTable<string, number | undefined>("values.optional");
console.log(optional.getOrInsert("u", undefined), optional.has("u"), optional.get("u"), optional.size);
console.log(optional.getOrInsert("n", 5), optional.get("n"));

const flags = new InternTable<number, boolean>("values.flags");
console.log(flags.getOrInsert(1, true), flags.getOrInsert(2, false), flags.get(1), flags.get(2), flags.get(3));
const words = new InternTable<number, string>("values.words");
const word = words.getOrInsertComputed(7, (k) => `word-${k}`.repeat(2));
console.log(word, word.length, words.get(7) === word);
const big = new InternTable<string, bigint>("values.big");
console.log(big.getOrInsert("b", 2n ** 70n), big.get("b") === 2n ** 70n);

const json = new InternTable<string, unknown>("values.json");
const parsed = json.getOrInsertComputed("doc", () => JSON.parse('{"a":[1,2,{"b":"c"}],"d":null}'));
console.log(JSON.stringify(parsed), JSON.stringify(json.get("doc")));

// Values that cannot be published are refused, and nothing is stored.
class Handler {
  readonly name: string;
  readonly run: () => number;
  constructor(name: string, run: () => number) {
    this.name = name;
    this.run = run;
  }
}
const handlers = new InternTable<string, Handler>("values.handlers");
attempt("function value", () => {
  handlers.getOrInsert("h", new Handler("h", () => 1));
});
console.log(handlers.has("h"), handlers.size);
const loose = new InternTable<string, unknown>("values.loose");
attempt("checked function", () => {
  loose.getOrInsertComputed("f", () => JSON.parse("[1]").concat([(): number => 1]));
});
console.log(loose.has("f"), loose.size);
