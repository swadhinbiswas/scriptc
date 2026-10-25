// Wide checked objects preserve insertion order, descriptor behavior, and
// lookups when entries move after deletion or are replaced by accessors.
const object = JSON.parse("{}");
for (let i = 95; i >= 0; i--) object[String(i)] = i * 3;
for (const key of ["tail", "01", "4294967295", "4294967294", "-0", "", "a\0b", "é😀"]) object[key] = key;
console.log(Object.keys(object).join("|"));
console.log(Object.values(object).join("|"));
for (let i = 0; i < 96; i += 3) delete object[String(i)];
for (let i = 0; i < 96; i += 3) object[String(i)] = -i;
object.tail = "updated";
Object.defineProperty(object, "hidden", { value: 42, enumerable: false, configurable: true });
Object.defineProperty(object, "31", { get() { delete object["32"]; object.added = 123; return "getter"; }, enumerable: true, configurable: true });
console.log(Object.entries(object).map(([key, value]) => key + ":" + value).join("|"));
console.log(Reflect.ownKeys(object).join("|"));
console.log(object.hidden, object.missing, object["a\0b"], object["é😀"]);
for (let i = 0; i < 96; i++) delete object[String(i)];
console.log(Object.keys(object).join("|"));
for (let i = 0; i < 100; i++) object["key-" + i] = i;
Object.freeze(object);
try { object["key-50"] = 0; } catch (error) { console.log(error.name); }
console.log(object["key-50"], Object.keys(object).length);
const duplicates = JSON.parse('{"32":1,"1":2,"32":3,"x":4,"x":5}');
console.log(JSON.stringify(duplicates));
// Recycling and cyclic destruction must discard all index storage.
for (let round = 0; round < 40; round++) {
  const cycle = JSON.parse("{}");
  for (let i = 0; i < 80; i++) cycle["property-" + i] = round + i;
  cycle.self = cycle;
  console.log(cycle["property-79"], Object.keys(cycle).length);
}
