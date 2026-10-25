// JSON.parse(text) as T keeps records with optional and nullable members on
// the one-pass schema parser. A missing optional member is ABSENT (no own
// property), a present one holds its value, and JSON null lands in the null
// arm. Key order, `in`, Object.keys, hasOwnProperty, stringify, and
// later writes and deletes observe exactly what Node's parsed object has.
// Every input is a VALID cast, so Node (where `as` is a no-op) and the native
// binary must agree on both the direct and the checked-dynamic route.

interface Meta {
  source: string;
  version: number;
}
interface User {
  id: number;
  name?: string;
  email?: string | null;
  age?: number;
  verified?: boolean;
  metadata: Meta | null;
  parent: number | null;
  note: string | null;
  tags?: string[];
  manager?: Meta | null;
}

function describe(label: string, u: User): void {
  const keys = Object.keys(u).join(",");
  const has = ["name", "email", "age", "verified", "tags", "manager"]
    .map((k) => `${k}:${k in u ? "y" : "n"}`)
    .join(" ");
  console.log(label, keys);
  console.log("  has", has, Object.prototype.hasOwnProperty.call(u, "age"));
  console.log(
    "  values",
    u.id,
    u.name === undefined ? "-" : u.name,
    u.email === undefined ? "undef" : u.email === null ? "null" : u.email,
    u.age ?? -1,
    u.verified === undefined ? "?" : u.verified,
    u.metadata === null ? "nometa" : `${u.metadata.source}@${u.metadata.version}`,
    u.parent ?? "root",
    u.note ?? "nonote",
    u.tags === undefined ? "notags" : u.tags.join("+"),
    u.manager === undefined ? "nomgr" : u.manager === null ? "nullmgr" : u.manager.source,
  );
  console.log("  json", JSON.stringify(u));
}

function attempt(label: string, text: string): void {
  try {
    describe(label, JSON.parse(text) as User);
  } catch (e) {
    console.log("caught", label, e instanceof SyntaxError);
  }
}

// Every member present, in declaration order.
attempt(
  "full",
  '{"id":1,"name":"ada","email":"a@x.io","age":36,"verified":true,"metadata":{"source":"api","version":2},' +
    '"parent":0,"note":"hi","tags":["a","b"],"manager":{"source":"hr","version":1}}',
);
// Only the required members: each optional member is absent.
attempt("required only", '{"id":2,"metadata":null,"parent":null,"note":null}');
// Absent members at the start, middle and end of the declaration order.
attempt("gaps", '{"id":3,"age":0,"metadata":null,"parent":2,"note":"","manager":null}');
attempt("tail", '{"id":4,"name":"","metadata":{"source":"","version":-0},"parent":-1.5,"note":null}');
// Explicit nulls for nullable optional members stay present.
attempt("nulls", '{"id":5,"email":null,"metadata":null,"parent":null,"note":null,"manager":null}');
// Keys out of declaration order with absent members: Node's key order wins.
attempt("reordered", '{"note":"n","parent":7,"id":6,"metadata":null,"verified":false,"name":"r"}');
// Undeclared members beside absent ones.
attempt(
  "extra",
  '{"id":7,"extra":{"deep":[1,null]},"metadata":null,"parent":null,"note":null,"age":44,"more":"x"}',
);
// Escaped keys still match optional members.
attempt("escaped", '{"id":8,"n\\u0061me":"esc","metadata":null,"parent":null,"note":null,"\\u0061ge":3}');
// Whitespace everywhere.
attempt(
  "spaced",
  ' {\n "id" : 9 ,\t"tags" : [ ] , "metadata" : { "source" : "s" , "version" : 1 } ,\r\n "parent" : null , "note" : null } ',
);
// Duplicate keys: the last value wins, as in Node.
attempt("duplicate", '{"id":10,"age":1,"metadata":null,"parent":null,"note":null,"age":2}');
attempt("duplicate null", '{"id":11,"note":"a","metadata":null,"parent":null,"note":null}');
// Syntax errors throw the same SyntaxError on both sides.
attempt("truncated", '{"id":12,"metadata":null,"parent":null,"note":null');
attempt("trailing comma", '{"id":13,"metadata":null,"parent":null,"note":null,}');

// Arrays of records with optional members, mixing present and absent.
const many = JSON.parse(
  '[{"id":1,"metadata":null,"parent":null,"note":null},' +
    '{"id":2,"name":"b","metadata":{"source":"x","version":3},"parent":1,"note":"n","age":20},' +
    '{"id":3,"verified":true,"metadata":null,"parent":2,"note":null,"tags":[]}]',
) as User[];
let total = 0;
for (const u of many) {
  total += u.id + (u.age ?? 0) + (u.metadata?.version ?? 0);
  console.log(u.id, Object.keys(u).length, "name" in u, "verified" in u, JSON.stringify(u));
}
console.log("total", total);

// Writes after the parse: assigning undefined keeps the key, delete drops it.
const w = JSON.parse('{"id":20,"name":"w","metadata":null,"parent":null,"note":null}') as User;
w.name = undefined;
console.log("name" in w, Object.keys(w).join(","), JSON.stringify(w));
delete w.name;
console.log("name" in w, Object.keys(w).join(","));

// Nested optional records inside optional records.
interface Node {
  label: string;
  child?: Node;
  next: Node | null;
}
function walk(n: Node, depth: number): void {
  console.log(" ".repeat(depth) + n.label, "child" in n, n.next === null);
  if (n.child !== undefined) walk(n.child, depth + 1);
  if (n.next !== null) walk(n.next, depth);
}
const tree = JSON.parse(
  '{"label":"root","child":{"label":"a","next":{"label":"b","child":{"label":"c","next":null},"next":null}},"next":null}',
) as Node;
walk(tree, 0);
console.log(JSON.stringify(tree));

// Every member optional: the empty object parses with every member absent.
interface Loose {
  a?: number;
  b?: string;
  c?: boolean;
}
const empty = JSON.parse("{}") as Loose;
console.log(Object.keys(empty).length, "a" in empty, JSON.stringify(empty));
const some = JSON.parse('{"c":false,"a":1}') as Loose;
console.log(Object.keys(some).join(","), some.a, some.b, some.c, JSON.stringify(some));
