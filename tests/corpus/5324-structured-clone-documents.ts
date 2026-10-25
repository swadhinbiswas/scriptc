// structuredClone of plain data builds a fresh document; serializing it,
// writing into it and closing cycles through it behave as for any object.
const source: any = JSON.parse('{"a":[1,2,{"b":"x"}],"n":null,"s":"text","f":1.5}');
source.missing = undefined;
const clone: any = structuredClone(source);
console.log(JSON.stringify(clone));
console.log(JSON.stringify(clone, null, 2));
console.log(clone !== source, clone.a !== source.a, JSON.stringify(source) === JSON.stringify(clone));

// A cycle closed after cloning is still collected and observable.
const tree: any = structuredClone(JSON.parse('{"items":[{"id":1},{"id":2}]}'));
tree.items[0].owner = tree;
console.log(tree.items[0].owner === tree, Object.keys(tree.items[0]).join(","));
try {
  JSON.stringify(tree);
} catch (error) {
  console.log((error as Error).name);
}
tree.items[0].owner = null;
console.log(JSON.stringify(tree));

// Members JSON cannot spell as plain data keep their serialization.
const bytesHolder: any = { n: 3 };
bytesHolder.bytes = new Uint8Array([1, 2]);
console.log(JSON.stringify(structuredClone(bytesHolder)));
const bigHolder: any = { n: 3 };
bigHolder.big = 10n;
try {
  JSON.stringify(structuredClone(bigHolder));
} catch (error) {
  console.log((error as Error).name);
}

// Many short-lived clones, some closed into cycles.
let total = 0;
for (let i = 0; i < 3000; i++) {
  const input: any = JSON.parse('{"list":[0,{"k":0}]}');
  input.list[1].k = i;
  const copy: any = structuredClone(input);
  if (i % 3 === 0) copy.list[1].back = copy;
  if (i % 5 === 0) copy.list.push(copy.list);
  total = total + copy.list[1].k;
}
console.log(total);
