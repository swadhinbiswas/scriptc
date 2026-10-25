// Object.entries and Object.values over checked-dynamic values in
// JavaScript: the results are ordinary arrays that accept any value.
function entriesOf(o) {
  return Object.entries(o);
}
function valuesOf(o) {
  return Object.values(o);
}
const parsed = JSON.parse('{"b":1,"1":"one","a":[true]}');
const entries = entriesOf(parsed);
console.log(entries, valuesOf(parsed));
entries.push(42);
entries[0] = "replaced";
console.log(entries, entriesOf(parsed).length);
for (const [k, v] of entriesOf({ x: 1, y: "two" })) console.log(k, v);
const values = valuesOf({ x: 1, y: "two" });
values.push({ z: 3 });
console.log(values);
try {
  entriesOf(null);
} catch (e) {
  console.log(e.name, e.message);
}
