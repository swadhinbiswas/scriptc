// Destructuring PRIMITIVE and unit sources (`let { toFixed } = 1`): JS
// reads through the value's wrapper object — prototype members included —
// or throws its TypeError on null/undefined. Under --dynamic the value
// marshals into the engine and the real pattern runs, so the extracted
// members are the engine's own (an unbound prototype method behaves
// exactly like Node's, .call receiver rules included); a static build
// reports the SC2010 dynamic-family choice.
{ let { toString } = 1; console.log(`${toString.call(9)}`); }
{
  let { toFixed } = 1;
  console.log(`${toFixed.call(2.5, 1)}`);
}
const { length } = "abc";
console.log(length);
const [c1, c2] = "xy";
console.log(`${c1}${c2}`);
try {
  const { anything } = null as any;
} catch (e) { console.log("null throws"); }
console.log("done");
