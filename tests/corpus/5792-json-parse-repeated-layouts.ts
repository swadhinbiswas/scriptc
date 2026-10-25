// JSON.parse follows the key sequences of objects it already built in the
// same document. Members that leave a known sequence, repeat a key, spell a
// known key with escapes, or merely share a prefix with one must decode
// exactly as Node decodes them.

function show(label: string, text: string): void {
  const value: any = JSON.parse(text);
  console.log(label, JSON.stringify(value));
}

function keysOf(label: string, text: string): void {
  const value: any[] = JSON.parse(text);
  for (const o of value) console.log(label, Object.keys(o).join("|"), JSON.stringify(o));
}

// A repeated key after a known layout: the later value wins in place.
keysOf("duplicate", '[{"a":1,"b":2},{"a":1,"b":2,"a":3},{"a":4,"a":5,"b":6},{"a":7,"b":8}]');

// Escaped spellings of known keys decode to the same key.
keysOf("escaped", '[{"ab":1,"cd":2},{"a\\u0062":3,"cd":4},{"ab":5,"c\\u0064":6},{"ab":7,"cd":8}]');
keysOf("escaped quote", '[{"q\\"":1},{"q\\"":2},{"q":3}]');

// Keys that share prefixes with known keys.
keysOf("prefix", '[{"ab":1},{"abc":2},{"a":3},{"ab":4,"abc":5},{"abc":6,"ab":7}]');

// Empty and non-ASCII keys.
keysOf("unicode", '[{"":1,"é":2,"日本":3},{"":4,"é":5,"日本":6},{"é":7,"":8}]');

// The same keys in other orders, and missing or extra members.
keysOf("order", '[{"x":1,"y":2,"z":3},{"y":4,"x":5,"z":6},{"x":7,"y":8},{"x":9,"y":10,"z":11,"w":12}]');

// Integer-like keys keep JavaScript's own-key order.
keysOf("indexes", '[{"b":1,"1":2,"a":3,"0":4},{"b":5,"1":6,"a":7,"0":8}]');

// Nested objects with their parent's keys.
show("nested", '{"id":1,"child":{"id":2,"child":{"id":3,"child":null}},"next":{"id":4,"child":{"id":5}}}');

// Records that grow wide enough for an indexed lookup.
const wideKeys: string[] = [];
for (let i = 0; i < 40; i++) wideKeys.push("field" + i);
const wideRecord = (base: number): string =>
  "{" + wideKeys.map((k, i) => '"' + k + '":' + (base + i)).join(",") + "}";
const wide: any[] = JSON.parse("[" + wideRecord(0) + "," + wideRecord(100) + "," + wideRecord(200) + "]");
for (const o of wide) console.log("wide", o.field0, o.field17, o.field39, Object.keys(o).length);
console.log("wide duplicate", JSON.stringify(JSON.parse("[" + wideRecord(0) + ',{"field0":1,"field1":2,"field0":3}]')[1]));

// More distinct keys than the parser remembers.
const manyParts: string[] = [];
for (let i = 0; i < 5000; i++) manyParts.push('"k' + i + '":' + i);
const many: any = JSON.parse("{" + manyParts.join(",") + "}");
let manySum = 0;
for (const key of Object.keys(many)) manySum = manySum + many[key];
console.log("many", Object.keys(many).length, manySum, many.k0, many.k4999);
const manyRows: any[] = JSON.parse("[" + manyParts.map((part) => "{" + part + "}").join(",") + "]");
console.log("many rows", manyRows.length, JSON.stringify(manyRows[0]), JSON.stringify(manyRows[4999]));

// __proto__ is an ordinary own key in JSON.parse output.
keysOf("proto", '[{"__proto__":1,"a":2},{"__proto__":3,"a":4}]');

// Repeated parses reuse recycled objects whose old keys differ.
let total = 0;
for (let round = 0; round < 5; round++) {
  const key = round % 2 === 0 ? "even" : "odd";
  const text = "[" + Array.from({ length: 50 }, (_, i) => '{"' + key + '":' + i + ',"n":' + round + "}").join(",") + "]";
  const rows: any[] = JSON.parse(text);
  for (const row of rows) total = total + (round % 2 === 0 ? row.even : row.odd) + row.n;
  console.log("round", round, Object.keys(rows[49]).join("|"), JSON.stringify(rows[0]));
}
console.log("total", total);

// Syntax errors after a followed key still throw.
for (const bad of ['[{"a":1},{"a" 1}]', '[{"a":1},{"a":}]', '[{"a":1},{"a"', '[{"ab":1},{"ab']) {
  try {
    JSON.parse(bad);
    console.log("parsed", bad);
  } catch (e) {
    console.log("error", (e as Error).name);
  }
}
