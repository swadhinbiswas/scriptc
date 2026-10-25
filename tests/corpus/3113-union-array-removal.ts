// Removal widens union tags while preserving the identities of payloads.
interface Left { kind: "left"; label: string; count: number }
interface Right { kind: "right"; label: string; enabled: boolean }
type Item = Left | Right;
const left: Left = { kind: "left", label: "left", count: 1 };
const right: Right = { kind: "right", label: "right", enabled: true };
const items: Item[] = [left, right, left];
const identity = new Map<Item, string>();
identity.set(left, "original-left");
identity.set(right, "original-right");
let calls = 0;
function source(): Item[] { calls++; return items; }
const last = source().pop();
if (last !== undefined) {
  console.log(identity.get(last), last.kind, items.length, calls);
  if (last.kind === "left") last.count = 42;
}
console.log(left.count);
const first = source().shift();
if (first !== undefined) console.log(identity.get(first), first.label, items.length, calls);
const final = items.shift();
if (final !== undefined) console.log(identity.get(final), final.label, items.length);
console.log(items.pop() === undefined, items.shift() === undefined);

// Payload kinds can differ, and the insertion of undefined can reorder tags.
const scalars: (string | number | boolean)[] = ["text", 0, false, 9, "last"];
for (let i = 0; i < 7; i++) {
  const value = i % 2 === 0 ? scalars.pop() : scalars.shift();
  console.log(typeof value, value, scalars.length);
}

// Holes are missing values, yet the removal still shrinks the receiver.
const sparse: (string | number)[] = ["start", 2];
sparse.length = 5;
console.log(sparse.pop(), sparse.length);
console.log(sparse.shift(), sparse.length);
console.log(sparse.pop(), sparse.length);
console.log(sparse.shift(), sparse.length);
console.log(sparse.shift(), sparse.length);
console.log(sparse.shift(), sparse.length);

// A removed refcounted payload survives after the array drops its ownership.
function fresh(): Item[] {
  return [{ kind: "left", label: "fresh", count: 7 }, { kind: "right", label: "fresh-right", enabled: false }];
}
const popped = fresh().pop();
const shifted = fresh().shift();
if (popped !== undefined) console.log(popped.label);
if (shifted !== undefined) console.log(shifted.label);

// Discarded results use the same mutation semantics and release ownership.
for (let i = 0; i < 40; i++) {
  const temporary = fresh();
  temporary.pop();
  temporary.shift();
  temporary.pop();
  if (temporary.length !== 0) throw new Error("not empty");
}
console.log("removed");

// A typed array of checked values needs no extra union box for undefined.
function shiftChecked<T>(values: T[]): T | undefined { return values.shift(); }
function popChecked<T>(values: T[]): T | undefined { return values.pop(); }
const checked: unknown[] = [{ value: 7 }, "last"];
console.log(popChecked(checked), shiftChecked(checked));
console.log(popChecked(checked), shiftChecked(checked), checked.length);
