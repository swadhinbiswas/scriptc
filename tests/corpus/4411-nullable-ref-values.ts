// Unions of one class instance and `undefined` (or `null`) are the instance
// pointer itself: NULL is the unit arm and no union box exists. This pins
// such values through every flow: locals and parameter walks, returns,
// narrowing (=== / !== / truthiness / instanceof / ?. / ?? / ||), equality
// and identity, fields, array elements, Map values, closure captures
// (read-only and mutated), generic containers and functions, widening into
// larger unions and `unknown`, console.log, async
// payloads, generators, sorting with comparators, and parent cycles the
// collector must reclaim.

class Tree {
  name: string;
  parent: Tree | undefined;
  kids: Tree[] = [];
  constructor(name: string, parent?: Tree) {
    this.name = name;
    this.parent = parent;
    if (parent) parent.kids.push(this);
  }
}

class Shape {
  sides = 0;
}
class Square extends Shape {
  sides = 4;
}

function label(t: Tree | undefined): string {
  return t === undefined ? "-" : t.name;
}

function rootOf(t: Tree): Tree {
  let cur: Tree | undefined = t;
  let last = t;
  while (cur) {
    last = cur;
    cur = cur.parent;
  }
  return last;
}

function depth(t: Tree | undefined): number {
  let n = 0;
  for (let cur = t; cur !== undefined; cur = cur.parent) n++;
  return n;
}

function findKid(t: Tree, name: string): Tree | undefined {
  for (const k of t.kids) if (k.name === name) return k;
  return undefined;
}

const root = new Tree("root");
const mid = new Tree("mid", root);
const leaf = new Tree("leaf", mid);
console.log("walk", rootOf(leaf).name, depth(leaf), depth(undefined), depth(root));
console.log("find", label(findKid(root, "mid")), label(findKid(root, "nope")));
console.log("chain", leaf.parent?.parent?.name, root.parent?.name, leaf.parent?.kids.length);
console.log("nullish", (root.parent ?? leaf).name, (leaf.parent ?? root).name);
console.log("or", (findKid(mid, "x") || root).name, (findKid(mid, "leaf") || root).name);

// Equality and identity.
const m1: Tree | undefined = findKid(root, "mid");
const m2: Tree | undefined = leaf.parent;
const none1: Tree | undefined = findKid(leaf, "a");
const none2: Tree | undefined = undefined;
console.log("eq", m1 === m2, m1 !== m2, none1 === none2, m1 === none1, m1 === mid, Object.is(m1, m2));

// null rather than undefined.
let current: Tree | null = null;
console.log("null", current === null, current, (current ?? leaf).name);
current = leaf;
console.log("null2", current === null, current?.name, current !== null && current.name === "leaf");

// instanceof through a nullable hierarchy reference.
function isSquare(s: Shape | undefined): string {
  if (s instanceof Square) return `square:${s.sides}`;
  return s === undefined ? "undef" : `shape:${s.sides}`;
}
console.log("instanceof", isSquare(new Square()), isSquare(new Shape()), isSquare(undefined));

// Fields, reassignment, and reading back.
class Slot {
  held: Tree | undefined;
  other: Tree | null = null;
}
const slot = new Slot();
console.log("slot0", label(slot.held), slot.other === null);
slot.held = mid;
slot.other = slot.held ?? null;
slot.held = slot.held;
console.log("slot1", label(slot.held), slot.other?.name);
slot.held = undefined;
console.log("slot2", label(slot.held), slot.held === undefined, slot.other?.name);

// Arrays: literals, push, holes vs undefined, find, index reads, sort.
const arr: (Tree | undefined)[] = [root, undefined, leaf];
arr.push(findKid(root, "zzz"));
arr.push(mid);
console.log("arr", arr.length, arr.map(label).join(","), arr.indexOf(undefined), arr.includes(mid));
const firstMissing = arr.findIndex((t) => t === undefined);
const found = arr.find((t) => t !== undefined && t.name === "leaf");
console.log("arrfind", firstMissing, label(found), label(arr[10]), label(arr.at(-1)));
const popped = arr.pop();
const shifted = arr.shift();
console.log("arrpop", label(popped), label(shifted), arr.length);
const sparse: (Tree | null)[] = [leaf, null, root, mid, null];
sparse.sort((a, b) => (a === null ? 1 : 0) - (b === null ? 1 : 0) || (a && b ? a.name.localeCompare(b.name) : 0));
console.log("sorted", sparse.map((t) => (t === null ? "null" : t.name)).join(","));
const compact = sparse.filter((t): boolean => t !== null);
console.log("filtered", compact.map((t) => (t === null ? "?" : t.name)).join(","));

// Map values and lookups.
const byName = new Map<string, Tree | undefined>();
byName.set("root", root);
byName.set("gone", undefined);
console.log("map", label(byName.get("root")), label(byName.get("gone")), label(byName.get("missing")), byName.has("gone"), byName.size);
const parents = new Map<string, Tree>();
for (const t of [root, mid, leaf]) if (t.parent) parents.set(t.name, t.parent);
console.log("map2", label(parents.get("leaf")), label(parents.get("root")), parents.get("mid") === root);
for (const [k, v] of byName) console.log("entry", k, label(v));

// Closures: read-only and mutated captures.
let cursor: Tree | undefined = leaf;
const step = (): string => {
  const was = label(cursor);
  cursor = cursor?.parent;
  return was;
};
console.log("closure", step(), step(), step(), step(), label(cursor));
const fixed = findKid(root, "mid");
const readFixed = (): string => label(fixed);
console.log("closure2", readFixed());

// Generic containers and functions.
class Box<T> {
  value: T;
  constructor(value: T) {
    this.value = value;
  }
  get(): T {
    return this.value;
  }
}
function identity<T>(v: T): T {
  return v;
}
const box = new Box<Tree | undefined>(mid);
const empty = new Box<Tree | undefined>(undefined);
console.log("generic", label(box.get()), label(empty.get()), label(identity(box.value)), label(identity<Tree | undefined>(undefined)));
box.value = undefined;
console.log("generic2", label(box.get()), box.get() === empty.get());

// Widening into larger unions and unknown, and checked casts back.
function wide(t: Tree | undefined): Tree | string | undefined {
  return t;
}
function asText(v: Tree | string | undefined): string {
  if (typeof v === "string") return `str:${v}`;
  return v === undefined ? "undef" : `tree:${v.name}`;
}
console.log("wide", asText(wide(mid)), asText(wide(undefined)), asText("s"));
const u1: unknown = findKid(root, "mid");
const u2: unknown = findKid(root, "nope");
console.log("unknown", u1 === mid, u2 === undefined, typeof u1, typeof u2);

// console.log of nullable references (JSON of records: 4412).
class Point {
  x = 1;
  y = 2;
}
const pt: Point | undefined = Math.random() < 2 ? new Point() : undefined;
const nopt: Point | undefined = Math.random() > 2 ? new Point() : undefined;
console.log("inspect", pt, nopt, [pt, nopt]);

// Async payloads and generators.
async function later(name: string): Promise<Tree | undefined> {
  await null;
  return findKid(root, name);
}
function* ancestors(t: Tree | undefined): Generator<Tree | undefined> {
  for (let cur = t; cur; cur = cur.parent) yield cur;
  yield undefined;
}
const seen: string[] = [];
for (const t of ancestors(leaf)) seen.push(label(t));
console.log("gen", seen.join(">"));
async function main(): Promise<void> {
  const a = await later("mid");
  const b = await later("nope");
  console.log("async", label(a), label(b));
  const raced = await Promise.race([later("mid"), later("zzz")]);
  console.log("race", label(raced));
  const pending: Promise<Tree | undefined>[] = [later("mid"), later("zzz")];
  const all = await Promise.all(pending);
  console.log("all", all.map(label).join(","));
}

// Parent cycles: unreachable trees must be reclaimed by the collector.
function churn(n: number): number {
  let total = 0;
  for (let i = 0; i < n; i++) {
    const r = new Tree(`r${i}`);
    const k = new Tree(`k${i}`, r);
    r.parent = k; // a cycle through a nullable field
    total += k.parent === r && r.parent?.parent === r ? 1 : 0;
  }
  return total;
}
console.log("churn", churn(2000));

main().then(() => console.log("done"));
