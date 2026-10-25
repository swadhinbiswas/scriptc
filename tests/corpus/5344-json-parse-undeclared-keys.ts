// A JSON.parse result converted to a closed record type keeps the
// properties the type does not declare: JSON.stringify, untyped views,
// Object.keys/values/entries and console.log see them in the source's
// key order, beside the record's current field values.
const doc =
  '[{"id":0,"name":"user-0","score":7,"active":true},' +
  '{"id":1,"name":"user-1","score":3,"active":false}]';

// The benchmark shape: an annotated parse result read and re-serialized.
const rows: { score: number }[] = JSON.parse(doc);
let sum = 0;
for (let i = 0; i < rows.length; i++) sum += rows[i]!.score;
console.log(sum);
console.log(JSON.stringify(rows));
console.log(JSON.stringify(rows).length === doc.length);

// The `as` spelling and a single record.
const one = JSON.parse('{"b":1,"score":2,"a":[3,{"x":null}],"z":{"k":"v"}}') as { score: number };
console.log(JSON.stringify(one));
console.log(JSON.stringify(one, null, 2));

// Declared fields stay the source of truth; undeclared keys keep their
// positions around them.
one.score = 40;
console.log(JSON.stringify(one));

// Nested records and arrays of records each keep their own extra keys.
type Order = { total: number; customer: { name: string }; lines: { sku: string }[] };
const order: Order = JSON.parse(
  '{"id":"o1","customer":{"name":"Ada","tier":"gold","tags":["a","b"]},' +
    '"lines":[{"sku":"s1","qty":2},{"qty":1,"sku":"s2","note":{"gift":true}}],' +
    '"total":12.5,"meta":{"source":"web","ts":[2024,1]}}',
);
console.log(order.customer.name, order.lines.length, order.total);
console.log(JSON.stringify(order));
order.customer.name = "Grace";
order.lines[1]!.sku = "s3";
console.log(JSON.stringify(order));

// Optional declared fields: present, absent, then assigned later.
type Opt = { score: number; label?: string };
const opts: Opt[] = JSON.parse('[{"label":"x","extra":1,"score":1},{"score":2,"extra":2}]');
opts[1]!.label = "late";
console.log(JSON.stringify(opts));

// Untyped views read and write the undeclared keys, and writes persist.
const view = rows[0] as any;
console.log(view.id, view.name, view.active, view.score);
view.name = "renamed";
view.added = [1, 2];
console.log(JSON.stringify(rows[0]));
const unknownView: unknown = rows[1];
console.log(JSON.stringify(unknownView));

// Reflection sees every own key in source order.
console.log(Object.keys(rows[1]!).join(","));
const counts: { a: number } = JSON.parse('{"c":3,"a":1,"b":2}');
console.log(Object.keys(counts), Object.values(counts), Object.entries(counts));

// util.inspect through console.log.
console.log(rows[1]);
console.log(order.customer);

// Declared keys in another order than declared keep the source order too;
// a record in declaration order serializes as before.
const reordered: { score: number; name: string } = JSON.parse('{"name":"e","score":1}');
console.log(JSON.stringify(reordered), Object.keys(reordered).join(","));
const exact: { score: number; name: string } = JSON.parse('{"score":2,"name":"f"}');
exact.score = 3;
console.log(JSON.stringify(exact), Object.keys(exact).join(","));

// Keys that need escaping, repeated keys (the last value wins in the first
// position, as JSON.parse does), deeply nested undeclared values, and
// records in an array with differing key orders.
const esc: { score: number } = JSON.parse('{"q\\"k":1,"score":2,"\\u00e9":[3],"a\\nb":{}}');
console.log(JSON.stringify(esc), Object.keys(esc).length);
const dup: { score: number } = JSON.parse('{"x":1,"score":2,"x":3}');
console.log(JSON.stringify(dup));
const dupDeclared: { score: number } = JSON.parse('{"score":1,"y":0,"score":2}');
console.log(JSON.stringify(dupDeclared), dupDeclared.score);
const deep: { score: number } = JSON.parse('{"score":1,"d":' + "[".repeat(50) + "]".repeat(50) + "}");
console.log(JSON.stringify(deep).length);
const list: { a: number; b: string }[] = JSON.parse(
  '[{"b":"x","a":1},{"a":2,"b":"y"},{"c":null,"a":3,"b":"z"}]',
);
list[0]!.a = 9;
console.log(JSON.stringify(list), Object.keys(list[2]!).join());
