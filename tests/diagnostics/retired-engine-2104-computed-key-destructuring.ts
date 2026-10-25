// Computed keys in destructuring patterns over ISLAND sources: the
// engine runs the REAL pattern, so runtime-valued keys read at exactly
// JS's pattern position. Compiled-scope identifiers pass in as extra
// synthesized-function parameters; CALLS of such identifiers transport
// as calls and run engine-side at their pattern position — keys in
// pattern order, defaults lazily (the destructuringEvaluationOrder
// corpus's contract) — and a default may reference a name bound by an
// EARLIER element of the same pattern (the engine's mid-pattern scope
// IS JS's).
const src: any = { x: 1, y: "two", z: true };
function pick(key: string) {
  const { [key]: got } = src;
  return got;
}
console.log(`${pick("x")} ${pick("y")} ${pick("z")} ${pick("nope")}`);
function pick2(key: string) {
  const { [key]: got = "dflt" } = src;
  return got;
}
console.log(`${pick2("x")} ${pick2("nope")}`);
// Mixed static and runtime keys in one pattern.
const key2 = "y";
const { x: sx, [key2]: sy } = src;
console.log(`${sx} ${sy}`);
// Evaluation order: defaults fire before nested keys when the element is
// undefined; keys run in pattern order; the object-pattern default chain
// interleaves exactly like V8.
let traceS = "";
let order = (n: any): any => { traceS += `${n},`; return n; };
let [{ [order(1)]: x } = order(0)] = [];
console.log(traceS);
traceS = "";
let [{ [order(1)]: y } = order(0)] = [{}];
console.log(traceS);
traceS = "";
let { [order(0)]: { [order(2)]: z } = order(1), ...w } = {} as any;
console.log(traceS);
// A default referencing the previous element's fresh rest binding.
let [{ ...a }, b = a]: any[] = [{ x: 1 }];
console.log(typeof b, `${(b as any).x}`);
// Assignment twin: a runtime key over an island source reads through the
// engine's own indexing at the element's position.
const kk = "y" as string;
let asg: any = 0;
({ [kk]: asg } = src);
console.log(`${asg}`);
