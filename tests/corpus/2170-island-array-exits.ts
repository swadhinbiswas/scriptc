// Element access, .length, method calls, and element writes on ISLAND
// values whose declared type is an ARRAY (or a tuple / keyed record) —
// the SC9001 arrayGet/arrIntrinsic-on-jsval ICE family. The unchecked-
// overload rule mints the shape without npm: the implementation returns
// an island value ('any') under overloads claiming static composites, so
// the value stays an engine handle while the checker sees string[],
// [number, string], Record<string, string>. Reads ride engine ops; a
// declared-primitive element exits eagerly to the static type.

function parts(s: string): string[];
function parts(s: any): any {
  return s.split(",");
}

function pair(kind: string): [number, string];
function pair(kind: any): any {
  return [7, kind];
}

function bag(v: string): Record<string, string>;
function bag(v: any): any {
  return { "content-type": v, "x-id": "42" };
}

// Direct expression forms — index, length, dynamic index.
console.log(parts("a,b,c")[0]);
console.log(parts("a,b,c").length);
let i = 0;
i += 2;
console.log(parts("x,y,z")[i]);

// Engine Array.prototype methods run on the handle — every declared call
// form, including ones the static tables fence (indexOf's fromIndex).
console.log(parts("a,b,c").join("|"));
console.log(parts("m,n").map((s) => s.toUpperCase()).join("-"));
console.log(parts("q,r,q").indexOf("q", 1));
console.log(parts("z,y,x").sort().join(","));
console.log(parts("a,b").includes("b") ? "has" : "none");

// Tuple-typed claims: per-index declared types exit eagerly.
console.log(pair("seven")[0] + 1);
console.log(pair("seven")[1]);

// Keyed record reads through the handle.
console.log(bag("text/plain")["content-type"]);
console.log(bag("text/plain")["x-id"]);

// Element and keyed WRITES mutate the engine value in place.
function box(): string[];
function box(): any {
  return ["old", "keep"];
}
const b = box();
b[0] = "new";
console.log(b.join(","));

// Typed-array claims are the same family: element reads exit at the
// declared number type, length/byteLength ride engine reads, writes
// mutate the engine value.
function data(): Uint8Array;
function data(): any {
  return new Uint8Array([5, 6, 7]);
}
console.log(data()[0]);
console.log(data().length, data().byteLength);
const u = data();
u[1] = 60;
console.log(u[1]);
