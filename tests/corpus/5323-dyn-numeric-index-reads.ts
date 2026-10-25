// `value[i]` with a number `i` on unknown values: dense array elements read
// directly; every other index and receiver keeps JS property-name semantics.
const parsed: any = JSON.parse('[10,"twenty",{"thirty":30},[40],null,true]');
let sum = 0;
for (let i = 0; i < parsed.length; i++) {
  const item: any = parsed[i];
  console.log(i, typeof item, JSON.stringify(item));
  if (typeof item === "number") sum += item;
}
console.log("sum", sum);

const indexes: number[] = [-0, 0.5, -1, 6, 7, 1e21, NaN, Infinity, 2 ** 32, 3.0];
for (const index of indexes) {
  const read: any = parsed[index];
  console.log(String(index), typeof read, JSON.stringify(read));
}

// Holes and named properties.
const sparse: any = JSON.parse("[1,2,3,4]");
delete sparse[1];
sparse.extra = "named";
for (let i = 0; i < 5; i++) {
  const read: any = sparse[i];
  console.log("sparse", i, typeof read, read === undefined ? "undefined" : read);
}

// Receivers that are not arrays.
const object: any = JSON.parse('{"0":"zero","1.5":"one and a half","-1":"minus one","length":2}');
const keys: number[] = [0, 1.5, -1, 2];
for (const key of keys) {
  const read: any = object[key];
  console.log("object", key, read === undefined ? "undefined" : read);
}
const text: any = "hello";
for (let i = 0; i < 6; i++) {
  const read: any = text[i];
  console.log("string", i, read === undefined ? "undefined" : read);
}

// Writes through numeric indexes, then reads.
const grown: any = JSON.parse("[]");
for (let i = 0; i < 4; i++) grown[i] = i * i;
let total = 0;
for (let i = 0; i < 4; i++) {
  const value: number = grown[i];
  total += value;
}
console.log("grown", grown.length, total);
