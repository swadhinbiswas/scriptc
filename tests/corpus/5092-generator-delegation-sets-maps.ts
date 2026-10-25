// yield* over Sets and Maps follows the live iteration of their built-in
// iterators: values added during delegation are visited, deleted ones are
// skipped, and Map entries arrive as fresh [key, value] pairs.
const set = new Set(["a", "b", "c"]);
function* overSet(): Generator<string, void, undefined> {
  yield* set;
}
console.log([...overSet()]);
const gs = overSet();
console.log(gs.next().value);
set.delete("b");
set.add("d");
console.log(gs.next().value, gs.next().value, JSON.stringify(gs.next()));

const map = new Map<string, number>([
  ["one", 1],
  ["two", 2],
]);
function* overMap(): Generator<[string, number], void, undefined> {
  yield* map;
}
const entries = [...overMap()];
console.log(JSON.stringify(entries), entries[0] !== entries[1]);
const gm = overMap();
gm.next();
map.set("three", 3);
map.delete("two");
const step = gm.next();
console.log(step.done ? "done" : JSON.stringify(step.value), JSON.stringify(gm.next()));

// Leaving a delegation early through return() or throw() leaves the
// collection usable, including its compaction after heavy churn.
const gr = overMap();
gr.next();
gr.return();
const gt = overMap();
gt.next();
try {
  gt.throw(new Error("stop"));
} catch (e) {
  console.log("caught", e instanceof TypeError, (e as Error).message);
}
for (let i = 0; i < 40; i++) map.set("k" + i, i);
for (let i = 0; i < 40; i++) map.delete("k" + i);
console.log(map.size, JSON.stringify([...map]), JSON.stringify([...overMap()]));

// throw() while delegating over a Set raises a TypeError in the outer
// generator, where it can be caught.
function* catches(): Generator<number, string, undefined> {
  try {
    yield* new Set([10, 20, 30]);
  } catch (e) {
    console.log("caught", e instanceof TypeError, (e as Error).message);
    return "recovered";
  }
  return "finished";
}
const gc = catches();
console.log(gc.next().value, JSON.stringify(gc.throw(1)), JSON.stringify(gc.next()));

// return() while delegating over a Map runs the outer finally.
function* guarded(): Generator<[string, number], string, undefined> {
  try {
    yield* map;
  } finally {
    console.log("finally ran");
  }
  return "end";
}
const gg = guarded();
console.log(JSON.stringify(gg.next().value), JSON.stringify(gg.return("early")));

// Sets of objects yield the same objects; empty collections finish at once.
class Item {
  id: number;
  constructor(id: number) {
    this.id = id;
  }
}
const a = new Item(1);
const b = new Item(2);
function* items(s: Set<Item>): Generator<Item, number, undefined> {
  yield* s;
  return s.size;
}
const got = [...items(new Set([a, b, a]))];
console.log(got.length, got[0] === a, got[1] === b);
const empty = items(new Set());
const none = empty.next();
console.log(none.done, none.value);
function* emptyMap(): Generator<[number, boolean], string, undefined> {
  const r = yield* new Map<number, boolean>();
  return "r=" + String(r);
}
console.log(JSON.stringify(emptyMap().next()));

// Map entries convert into a wider yield channel.
function* wide(): Generator<unknown, void, undefined> {
  yield* new Map([[1, "x"]]);
  yield* new Set([true]);
}
console.log(JSON.stringify([...wide()]));
