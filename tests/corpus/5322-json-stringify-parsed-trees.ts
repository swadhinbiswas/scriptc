// JSON.stringify over parsed documents: nested arrays and objects of an
// untouched document serialize without the per-member protocol walk. Output,
// indentation, key order, omission and errors must match the full walk,
// including after writes that leave the document plain or not.
const doc =
  '{"name":"root","items":[{"id":1,"tags":["a","b"],"meta":{"x":null}},{"id":2,"tags":[],"meta":{}}],' +
  '"empty":{},"list":[[1,[2,[3]]],{"deep":{"deeper":{"deepest":true}}}],"2":"two","1":"one","toJSON":5}';

console.log(JSON.stringify(JSON.parse(doc)));
console.log(JSON.stringify(JSON.parse(doc), null, 2));
console.log(JSON.stringify(JSON.parse(doc), null, "--"));
console.log(JSON.stringify(JSON.parse("[[],[[]],{},[{}],[1,\"s\",true,null]]")));

// Deep documents recurse through the plain writer.
const deep: string = "[".repeat(900) + '{"k":[1,{"v":2}]}' + "]".repeat(900);
console.log(JSON.stringify(JSON.parse(deep)) === deep);

// Index-like names inside nested objects keep their numeric ordering.
console.log(JSON.stringify(JSON.parse('[{"b":1,"10":2,"a":3,"2":4},{"x":{"9":0,"1":1}}]')));

// A nested non-function toJSON member is ignored, as in Node.
console.log(JSON.stringify(JSON.parse('{"a":{"toJSON":"no","v":1},"b":[{"toJSON":null}]}')));

// Scalar writes, deletions and holes.
const edited: any = JSON.parse(doc);
edited.items[0].id = 10.5;
edited.items[1].meta.label = "added";
delete edited.items[0].meta.x;
delete edited.list[0][0];
edited.items[0].tags.length = 5;
console.log(JSON.stringify(edited));
console.log(JSON.stringify(edited, null, 1));

// Undefined members are omitted from objects and become null in arrays.
const omitted: any = JSON.parse('{"keep":1,"drop":2,"arr":[1,2,3]}');
omitted.drop = undefined;
omitted.arr[1] = undefined;
console.log(JSON.stringify(omitted));

// Writes that add functions or accessors take the protocol walk.
const withMethod: any = JSON.parse(doc);
withMethod.items[1].meta.toJSON = () => "converted";
console.log(JSON.stringify(withMethod));
const withReplacer: any = JSON.parse(doc);
console.log(JSON.stringify(withReplacer, (key: string, value: any) => (key === "id" ? value * 100 : value)));
console.log(JSON.stringify(withReplacer, ["name", "items", "id"]));
const withGetter: any = JSON.parse('{"a":{"b":1},"c":[1]}');
Object.defineProperty(withGetter.a, "computed", { get: () => 42, enumerable: true });
console.log(JSON.stringify(withGetter));
const hidden: any = JSON.parse('{"a":{"b":1,"c":2}}');
Object.defineProperty(hidden.a, "b", { enumerable: false });
console.log(JSON.stringify(hidden));

// A toJSON deep in the tree that mutates its ancestors mid-walk.
const mutating: any = JSON.parse('{"first":{"x":1},"second":{"y":2},"third":[1,2,3]}');
mutating.first.toJSON = () => {
  delete mutating.second;
  mutating.third.pop();
  mutating.added = "late";
  return "first";
};
console.log(JSON.stringify(mutating));

// Documents linked into cycles report the circular structure.
const cyclic: any = JSON.parse('{"a":{"b":[{"c":1}]}}');
cyclic.a.b[0].back = cyclic.a;
try {
  JSON.stringify(cyclic);
} catch (error) {
  console.log((error as Error).name, (error as Error).message);
}
const shared: any = JSON.parse('{"x":{"v":1}}');
const holder: any = JSON.parse('{"left":null,"right":null}');
holder.left = shared.x;
holder.right = shared.x;
console.log(JSON.stringify(holder));
