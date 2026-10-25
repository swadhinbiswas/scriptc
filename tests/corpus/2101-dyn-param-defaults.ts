// Parameter defaults over DYNAMIC-TIER ('any'-typed) values: the island
// slot holds the engine's undefined directly, so the ABI is the slot
// itself and the prologue picks the default on the runtime undefined
// test — identifier params, whole-pattern defaults (`{} = a`), and
// nested-pattern defaults whose value is a compiled-scope variable
// (passed into the synthesized engine pattern as an extra parameter).
// Explicitly-passed undefined triggers the default exactly like an
// omitted argument; null and falsy values do not — JS's rule.
var a: any = [10, 20];
var o: any = { p: { q: 1 } };
function f(x = o) { return typeof x; }
console.log(f(), f(5), f(undefined), f("s"), f(null));
function g({} = o, [] = a) { return "ok"; }
console.log(g());
console.log(g({ z: 1 }));
console.log(g({ z: 1 }, [7]));
const h = ({} = o) => "arrow";
console.log(h());
console.log(h(undefined));
console.log(h(3));
// Nested-pattern default referencing a compiled binding.
function k({ p: {} = o } = o) { return "nested"; }
console.log(k());
console.log(k({}));
console.log(k({ p: 5 }));
// A named binding through the engine pattern, defaults at both levels.
function names({ p: { q } = o } = o) { return q; }
console.log(`${names()} ${names({})} ${names({ p: { q: 9 } })}`);
// The function as a value: called through the binding, short and full.
const held = f;
console.log(held(), held(1));
// Defaults inside an arrow returned from a defaulted function.
function m(x = o) { return ({} = o, [] = a) => typeof x; }
console.log(m()());
console.log(m(42)());
