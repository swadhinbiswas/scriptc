// JSON.parse(text) as T with index signatures parses dictionaries and
// records with extra keyed members on the one-pass schema parser: each
// undeclared member joins the record's overflow map in source order. Key
// order, lookups, iteration, and stringify must match Node on both
// the direct and the checked-dynamic route.

interface Pkg {
  name: string;
  version: string;
  scripts?: Record<string, string>;
  dependencies: Record<string, string>;
}
interface Flags {
  version: number;
  flags: Record<string, boolean>;
  weights: { [key: string]: number };
}
interface Bucket {
  ids: number[];
  label: string | null;
}
interface Labeled {
  title: string;
  [key: string]: string;
}

function showPkg(label: string, text: string): void {
  try {
    const p = JSON.parse(text) as Pkg;
    const deps = Object.keys(p.dependencies);
    console.log(label, p.name, p.version, deps.join(","), deps.map((d) => p.dependencies[d]).join(","));
    console.log("  scripts", p.scripts === undefined ? "none" : Object.entries(p.scripts).map(([k, v]) => `${k}=${v}`).join(";"));
    console.log("  has", p.dependencies["react"] !== undefined, p.scripts?.["build"] !== undefined, p.dependencies["left-pad"] ?? "-");
    console.log("  json", JSON.stringify(p));
  } catch (e) {
    console.log("caught", label, e instanceof SyntaxError);
  }
}

showPkg(
  "full",
  '{"name":"app","version":"1.0.0","scripts":{"build":"tsc","test":"vitest"},"dependencies":{"react":"^19","left-pad":"1.3.0"}}',
);
showPkg("empty deps", '{"name":"lib","version":"0.0.1","dependencies":{}}');
showPkg("reordered", '{"dependencies":{"z":"1","a":"2","m":"3"},"version":"2","name":"r"}');
showPkg("escaped keys", '{"name":"e","version":"1","dependencies":{"\\u0061b":"x","c\\"d":"y","caf\\u00e9":"z"}}');
showPkg("unicode keys", '{"name":"u","version":"1","dependencies":{"日本":"1","😀":"2"}}');
showPkg("duplicate dep", '{"name":"d","version":"1","dependencies":{"a":"1","b":"2","a":"3"}}');
showPkg("extra top-level", '{"name":"x","version":"1","dependencies":{"a":"1"},"private":true,"keywords":["k"]}');
showPkg("truncated", '{"name":"t","version":"1","dependencies":{"a":"1"');
showPkg("bad value", '{"name":"t","version":"1","dependencies":{"a":"1",}}');

const flags = JSON.parse(
  '{"version":3,"flags":{"newUi":true,"beta":false,"darkMode":true},"weights":{"a":0.5,"b":-2,"c":1e3}}',
) as Flags;
for (const [k, v] of Object.entries(flags.flags)) console.log(k, v);
let sum = 0;
for (const k in flags.weights) sum += flags.weights[k]!;
console.log(sum, Object.keys(flags.weights).length, JSON.stringify(flags));

// Dictionaries of records and of arrays, nested.
const buckets = JSON.parse(
  '{"hot":{"ids":[1,2,3],"label":"h"},"cold":{"ids":[],"label":null},"warm":{"ids":[4],"label":"w"}}',
) as Record<string, Bucket>;
for (const [name, b] of Object.entries(buckets)) console.log(name, b.ids.length, b.label ?? "nolabel");
const nested = JSON.parse('{"a":{"x":[1,2],"y":[]},"b":{},"c":{"z":[3]}}') as Record<string, Record<string, number[]>>;
console.log(JSON.stringify(nested), Object.keys(nested.a!).join(","), Object.keys(nested.b!).length);
const list = JSON.parse('[{"k":"v"},{},{"k2":"v2","k3":"v3"}]') as Record<string, string>[];
console.log(list.map((d) => Object.keys(d).join("+")).join("|"), JSON.stringify(list));

// Declared members beside the index signature: declared ones keep their
// slots, the rest join the overflow in source order. (Native key order lists
// declared members first, so the text does too.)
const labeled = JSON.parse('{"title":"T","zeta":"1","alpha":"2"}') as Labeled;
console.log(labeled.title, labeled["zeta"], labeled["alpha"], Object.keys(labeled).join(","), JSON.stringify(labeled));
const plain = JSON.parse('{"title":"only"}') as Labeled;
console.log(plain.title, Object.keys(plain).join(","), JSON.stringify(plain));

// Writes after the parse.
const deps = JSON.parse('{"a":"1","b":"2"}') as Record<string, string>;
deps["c"] = "3";
delete deps["a"];
deps["b"] = "two";
console.log(Object.keys(deps).join(","), JSON.stringify(deps));
