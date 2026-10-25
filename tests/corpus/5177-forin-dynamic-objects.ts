// for-in and Object.keys over checked-dynamic objects: JSON values,
// prototypes, null-prototype objects, and keys added or deleted mid-walk.
const parsed: any = JSON.parse('{"b":1,"2":2,"a":3,"1":4,"nested":{"z":1,"y":2}}');
const keysIn = (o: unknown): string => {
  const out: string[] = [];
  for (const k in o as Record<string, unknown>) out.push(k);
  return out.join(",");
};
console.log(keysIn(parsed), keysIn(parsed.nested), Object.keys(parsed).join(","));

const visited: string[] = [];
for (const k in parsed) {
  visited.push(k);
  if (k === "1") {
    delete parsed.a;
    parsed.added = true;
  }
}
console.log("mutating", visited.join(","), Object.keys(parsed).join(","));

const bare = Object.create(null);
bare.z = 1;
bare["5"] = 2;
bare.y = 3;
console.log("null proto", keysIn(bare), Object.keys(bare).join(","));

const list: any = JSON.parse("[10, 20, 30]");
console.log("array", keysIn(list), Object.keys(list).join(","));

let count = 0;
for (let i = 0; i < 2000; i++) for (const k in parsed) count += k.length;
console.log("repeat", count);
console.log("empty", keysIn(JSON.parse("{}")), "[" + keysIn(null) + "]", "[" + keysIn(undefined) + "]");
