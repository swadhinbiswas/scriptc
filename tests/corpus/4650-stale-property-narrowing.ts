// TypeScript keeps a property's narrowing (and that of a binding a closure
// assigns) across calls: after `c.cb = fn` or `if (c.name !== undefined)`,
// a callback, method or getter that clears or replaces the property leaves
// later reads typed by the old value. Each read must observe the value the
// property holds now: optional calls and chains short-circuit, absence and
// type tests answer for the current value, other arms read their own
// members, and a member access on a cleared value throws Node's TypeError.
// Reads with no intervening code, or of construction-only fields, keep the
// narrowing.

class Callbacks {
  cb: ((s: string) => number) | undefined = undefined;
  name: string | undefined = "named";
  count: string | number = 1;
  item: Item | null = new Item(1);
  clear(): void {
    this.name = undefined;
    this.count = "many";
    this.item = null;
  }
}

class Item {
  v: number;
  constructor(v: number) {
    this.v = v;
  }
}

function message(e: unknown): string {
  return e instanceof TypeError ? `TypeError: ${e.message}` : String(e);
}

// The reported shape: the callback clears the field it was called through.
const c = new Callbacks();
c.cb = (s: string): number => {
  c.cb = undefined;
  return s.length;
};
console.log("optional calls:", c.cb?.("abc"), c.cb?.("abcd"));

function inFunction(target: Callbacks): void {
  target.cb = (s: string): number => {
    target.cb = undefined;
    return s.length * 10;
  };
  const first = target.cb?.("ab");
  const second = target.cb?.("abc");
  console.log("in a function:", first, second);
  target.cb = (s: string): number => {
    target.cb = undefined;
    return s.length + 100;
  };
  console.log("direct call:", target.cb("x"));
  try {
    console.log(target.cb("y"));
  } catch (e) {
    console.log("second direct call:", message(e));
  }
}
inFunction(new Callbacks());

// A method clears fields narrowed by a test; every consumer sees the clear.
function afterMethod(): void {
  const o = new Callbacks();
  if (o.name !== undefined) {
    o.clear();
    console.log("chain:", o.name?.length, o.name?.toUpperCase());
    console.log("nullish:", o.name ?? "none", o.name || "falsy");
    console.log("tests:", o.name === undefined, o.name !== undefined, typeof o.name, !o.name);
    console.log("condition:", o.name ? "present" : "absent");
    const kept: string | undefined = o.name;
    console.log("value:", o.name, `${o.name}`, kept);
    try {
      console.log(o.name.length);
    } catch (e) {
      console.log("member read:", message(e));
    }
  }
  const p = new Callbacks();
  if (p.item !== null) {
    p.clear();
    console.log("null arm:", p.item?.v, p.item === null);
    try {
      console.log(p.item.v);
    } catch (e) {
      console.log("member read:", message(e));
    }
  }
}
afterMethod();

// A union narrowed by typeof is replaced by its other arm.
function otherArm(): void {
  const o = new Callbacks();
  if (typeof o.count === "number") {
    o.clear();
    console.log("typeof after replace:", typeof o.count, o.count);
  }
}
otherArm();

// Interface (record) fields and a free function as the intervening call.
interface Options {
  label?: string;
  retries?: number;
}
const options: Options = {};
function resetOptions(): void {
  options.label = undefined;
  options.retries = undefined;
}
options.label = "first";
options.retries = 3;
resetOptions();
console.log("record fields:", options.label?.length, options.label ?? "unset", options.retries ?? -1);

// A getter is the intervening call; a narrowed getter reads afresh.
class Lazy {
  data: string | undefined = "data";
  reads = 0;
  get reset(): number {
    this.data = undefined;
    return 0;
  }
  get flip(): string | undefined {
    this.reads++;
    return this.reads % 2 === 1 ? "odd" : undefined;
  }
}
const lazy = new Lazy();
if (lazy.data) {
  const z = lazy.reset;
  console.log("getter clears:", z, lazy.data?.toUpperCase(), lazy.data ? "kept" : "gone");
}
if (lazy.flip) {
  console.log("narrowed getter:", lazy.flip?.length, typeof lazy.flip);
}

// Callbacks run by library code (forEach) and a loop whose body clears the
// field after the read, reaching the read again through the back edge.
const forEachTarget = new Callbacks();
forEachTarget.cb = (s: string): number => s.length * 2;
const doubled: (number | undefined)[] = [];
["a", "bb", "ccc"].forEach((s) => {
  doubled.push(forEachTarget.cb?.(s));
  if (s === "bb") forEachTarget.cb = undefined;
});
console.log("forEach:", doubled.join(" "));
const looped = new Callbacks();
const seen: string[] = [];
if (looped.item) {
  for (let i = 0; i < 3; i++) {
    seen.push(String(looped.item?.v));
    looped.clear();
  }
}
console.log("loop:", seen.join(" "));

// A store through another reference to the same object, with no call.
const aliased = new Callbacks();
const alias = aliased;
if (aliased.name) {
  alias.name = undefined;
  console.log("alias store:", aliased.name?.length, aliased.name === undefined);
}

// A discriminated union field replaced by another arm, and a subclass
// narrowed by instanceof replaced by its base class.
interface Circle {
  kind: "circle";
  r: number;
}
interface Square {
  kind: "square";
  side: number;
}
class Scene {
  shape: Circle | Square = { kind: "square", side: 2 };
  morph(): void {
    this.shape = { kind: "circle", r: 3 };
  }
}
const scene = new Scene();
if (scene.shape.kind === "square") {
  scene.morph();
  console.log("discriminant:", scene.shape.kind);
}
class Base {
  name(): string {
    return "base";
  }
}
class Derived extends Base {
  name(): string {
    return "derived";
  }
}
class Slot {
  v: Base = new Derived();
  reset(): void {
    this.v = new Base();
  }
}
const slot = new Slot();
if (slot.v instanceof Derived) {
  slot.reset();
  console.log("instanceof:", slot.v instanceof Derived, slot.v.name());
}

// A binding a closure assigns, as a value and as the root of a member read.
function closures(): void {
  let text: string | undefined = "text";
  const drop = (): void => {
    text = undefined;
  };
  text = "again";
  drop();
  console.log("closure binding:", text?.length, text ?? "dropped");
  let holder = new Callbacks();
  const swap = (): void => {
    holder = new Callbacks();
    holder.name = undefined;
  };
  if (holder.name) {
    swap();
    console.log("closure root:", holder.name?.length, holder.name ?? "swapped");
  }
}
closures();

// Narrowings that stay valid: no intervening call, only library calls, or
// construction-only fields across a user call.
class Tree {
  parent: Tree | undefined;
  label: string | undefined;
  depth: number;
  constructor(parent: Tree | undefined, label: string | undefined) {
    this.parent = parent;
    this.label = label;
    this.depth = parent ? parent.depth + 1 : 0;
  }
}
function visit(t: Tree): number {
  return t.depth;
}
function stable(t: Tree, out: number[]): number {
  let total = 0;
  if (t.parent) {
    visit(t);
    total += t.parent.depth;
  }
  if (t.label !== undefined) {
    out.push(Math.max(t.label.length, 1));
    total += t.label.length;
  }
  return total;
}
const leaf = new Tree(new Tree(new Tree(undefined, "root"), undefined), "leaf");
const lengths: number[] = [];
let sum = 0;
for (let i = 0; i < 1000; i++) sum += stable(leaf, lengths);
console.log("stable:", sum, lengths.length);
