// Declaration-position destructuring over ISLAND sources runs the REAL
// pattern in a synthesized strict-mode engine function: holes, nesting,
// rest, empty patterns (RequireObjectCoercible on object patterns, the
// iterator get-and-close on array patterns — destructuring undefined
// throws Node's TypeError at Node's exit), and transportable literal
// defaults all ride; bound names follow the island property-read rule
// (declared primitives exit eagerly, everything else stays a handle).
const a: any = [1, "two", true, 4, 5];
var [x, , y, ...rest] = a;
console.log(`${x} ${y} ${rest.length} ${rest[0]} ${rest[1]}`);
const o: any = { p: 1, q: { r: "deep" } };
const { p, q: { r } } = o;
console.log(`${p} ${r}`);
const { missing = 42 } = o;
console.log(`${missing}`);
const { p: p2 = 9, ...others } = o;
console.log(`${p2} ${others.q.r}`);
var [] = [1, 2] as any;
var {} = o;
console.log("empties ok");
const u: any = undefined;
try { var {} = u; } catch (e) { console.log("obj-undef throws"); }
try { var [] = 0 as any; } catch (e) { console.log("arr-num throws"); }
const [d1 = 10, d2 = 20] = [] as any;
console.log(`${d1} ${d2}`);
console.log("done");
