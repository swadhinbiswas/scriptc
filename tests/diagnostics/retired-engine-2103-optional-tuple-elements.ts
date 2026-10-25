// Tuples with OPTIONAL elements (`[string?, number?]`): the arity is a
// runtime fact no fixed shape carries, so the value lives in the engine —
// a real JS array with its true length. Destructuring declarations and
// assignments read through the island (absent positions are undefined,
// exactly JS), `.length` answers the runtime count, literal reads narrow
// per position, and tsc's contextual padding of an under-length literal
// (`options || []` types the empty literal at the tuple's full arity)
// builds island-native with its ACTUAL elements. Static builds fence
// with the dynamic-family story (SC2011) instead of the recitation.
function f2(options?: [string?, number?]) {
  let [str, num] = options || [];
  console.log(typeof str, typeof num, `${str} ${num}`);
  [str, num] = options || [];
  console.log(`${str} ${num}`);
}
f2();
f2(["a"]);
f2(["a", 1]);
f2([]);
const t: [string?, number?] = ["x"];
console.log(t.length, `${t[0]} ${t[1]}`);
const full: [string?, number?] = ["y", 7];
console.log(full.length, `${full[0]} ${full[1]}`);
const none: [string?, number?] = [];
console.log(none.length);
// A rest-element tuple rides the same island representation.
const r: [string, ...number[]] = ["head", 1, 2, 3];
console.log(r.length, `${r[0]} ${r[1]} ${r[3]}`);
