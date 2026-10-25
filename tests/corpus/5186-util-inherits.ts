// util.inherits from TypeScript: constructor functions typed with `this`
// parameters and constructors held as unknown values relink their
// prototype objects at runtime, super_ names the superclass, and objects
// created from the subclass prototype see methods added to the base.
// Wrong argument kinds throw Node's coded TypeErrors.
import * as util from "node:util";
import { inherits } from "node:util";

interface Named {
  name: string;
}

function Base(this: Named, name: string): void {
  this.name = name;
}
function Derived(this: Named, name: string): void {
  Base.call(this, name);
}
inherits(Derived, Base);

const derived: unknown = Derived;
const base: unknown = Base;
console.log(Reflect.get(derived as object, "super_") === Base);
const derivedPrototype: unknown = Reflect.get(derived as object, "prototype");
const basePrototype: unknown = Reflect.get(base as object, "prototype");
console.log(Object.getPrototypeOf(derivedPrototype as object) === basePrototype);
Reflect.set(basePrototype as object, "greet", function (this: Named) {
  return `hello from ${this.name}`;
});
const instance: unknown = Object.create(derivedPrototype as object);
Reflect.set(instance as object, "name", "ts");
const greet: unknown = Reflect.get(instance as object, "greet");
console.log(typeof greet, Reflect.apply(greet as (this: unknown) => string, instance, []));
console.log(Object.keys(derived as object), Object.getOwnPropertyNames(derived as object).includes("super_"));

const registry: { [name: string]: unknown } = {};
registry["Root"] = function Root(): void {};
registry["Leaf"] = function Leaf(): void {};
util.inherits(registry["Leaf"], registry["Root"]);
console.log(Reflect.get(registry["Leaf"] as object, "super_") === registry["Root"]);

const inputs: [string, unknown, unknown][] = [
  ["missing ctor", undefined, Base],
  ["null super", Derived, null],
  ["plain object super", Derived, {}],
  ["string super", Derived, "Base"],
];
for (const [label, ctor, superCtor] of inputs) {
  try {
    inherits(ctor, superCtor);
    console.log(label, "ok");
  } catch (error) {
    const e = error as Error & { code?: string };
    console.log(label, e.name, e.code, e.message);
  }
}
