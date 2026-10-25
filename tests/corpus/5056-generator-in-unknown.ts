// `in` and for-in over a generator object seen as `unknown`: its
// prototype methods and Object.prototype's members are found, and it owns
// no enumerable properties.
function* count(): Generator<number> {
  yield 1;
  yield 2;
}
const seen: unknown = count();
const object = seen as object;
console.log("next" in object, "return" in object, "throw" in object, "toString" in object, "missing" in object);
const keys: string[] = [];
for (const key in object) keys.push(key);
console.log("for-in", keys.length);
