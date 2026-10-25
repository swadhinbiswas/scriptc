// @exit: 1
// Destructuring assignment from island ('any'-typed) sources: the object
// pattern runs RequireObjectCoercible with V8's exact destructuring
// TypeError (source spelling and first property included), the array
// pattern runs the engine's real GetIterator protocol behind V8's exact
// not-iterable TypeError, and the expression form threads the RHS value.

var a: any;
let x, y, z;
try {
  ({ x, y, z } = a);
} catch (e) {
  console.log((e as Error).name, (e as Error).message);
}
try {
  ({} = a);
} catch (e) {
  console.log((e as Error).message);
}
try {
  [x, y] = a;
} catch (e) {
  console.log((e as Error).message);
}
try {
  [] = a;
} catch (e) {
  console.log((e as Error).message);
}
const n: any = 1.5;
try {
  [] = n;
} catch (e) {
  console.log((e as Error).message);
}

// Coercible sources: absent keys read undefined, arrays pad past the end,
// strings iterate by the string iterator.
const o: any = { x: 5, w: "s" };
({ x, y } = o);
console.log(`${x}`, y === undefined);
const arr2: any = ["a", "b"];
let m, k, j;
[m, k, j] = arr2;
console.log(`${m}`, `${k}`, j === undefined);
const str: any = "xy";
[m, k] = str;
console.log(`${m}`, `${k}`);

// The expression's value is the RHS value.
const got = ({ x } = o);
console.log(got === o);

// Array-pattern defaults apply exactly on undefined elements.
let dflt;
[m, dflt = "fallback"] = arr2;
console.log(`${m}`, `${dflt}`);
[, , dflt = "third"] = arr2;
console.log(`${dflt}`);

// A throwing chain ends the program with Node's exit code (the inner
// pattern's check throws before the outer's would).
({} = {} = a);
