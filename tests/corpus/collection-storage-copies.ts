type Row = { value: number };
const first: Row = { value: 1 };
const last: Row = { value: 2 };
const map = new Map<string, Row>([["first", first], ["gone", first], ["last", last]]);
map.delete("gone");
map.set("again", first);
const copy = new Map(map);
const entries = new Map(map.entries());
const keys = new Set(map.keys());
const values = new Set(map.values());
console.log("copies", copy !== map, entries !== map, [...keys].join(","), values.size);
first.value = 10;
map.clear();
console.log("owners", copy.get("first") === first, entries.get("last") === last, values.has(first));
console.log("shared", [...copy.values()].map(row => row.value).join(","));
copy.delete("first");
console.log("independent", entries.has("first"), keys.has("first"), values.has(first));

const set = new Set([first, last]);
const setCopy = new Set(set);
const setKeys = new Set(set.keys());
const setValues = new Set(set.values());
const array = [...set];
set.clear();
console.log("set owners", setCopy.size, setKeys.size, setValues.size, array[0] === first);
setCopy.add({ value: 3 });
console.log("set independent", setCopy.size, setKeys.size, array.length);

const numeric = new Map<number, number>([[-0, NaN], [1, NaN], [2, -0], [3, 0]]);
console.log("numeric values", [...new Set(numeric.values())].map(value => String(value) + ":" + String(1 / value)).join(","));
const keyCopy = new Set(numeric.keys());
console.log("numeric keys", [...keyCopy].map(value => String(1 / value)).join(","));
const empty = new Map<string, number>();
console.log("empty", new Map(empty).size, new Set(empty.keys()).size, new Set(empty.values()).size);
const dead = new Set([1, 2, 3]);
dead.clear();
console.log("dead", new Set(dead).size, [...dead].length);

const active = new Map<number, string>([[1, "one"], [2, "two"], [3, "three"]]);
const cursor = active.entries();
console.log("cursor first", cursor.next().value?.[0]);
active.delete(2);
active.set(4, "four");
const remaining = new Map(cursor);
console.log("cursor rest", [...remaining.keys()].join(","), cursor.next().done);
active.forEach((value, key) => {
  if (key === 1) {
    const snapshot = new Map(active);
    active.clear();
    active.set(5, "five");
    console.log("during iteration", [...snapshot.values()].join(","));
  }
  console.log("visit", key, value);
});

let selected = new Set([1, 2]);
let evaluations = 0;
function source(): Set<number> { evaluations++; return selected; }
const evaluated = new Set(source());
selected = new Set([8]);
const maybe: Set<number> | undefined = evaluations === 1 ? evaluated : undefined;
console.log("evaluation", evaluations, [...new Set(maybe ?? selected)].join(","), [...selected].join(","));

const typed = new Map<boolean, number>([[true, 1], [false, 2]]);
const boxed: unknown = typed;
const broad = boxed as Map<unknown, unknown>;
const broadKeys = new Set(broad.keys());
const broadValues = new Set(broad.values());
broadKeys.add("third");
broadValues.add("third");
console.log("wide copies", broadKeys.size, broadValues.size, typed.size, broadKeys.has(true), broadValues.has(2));
