// Object.groupBy returns a null-prototype object: inspection prints the
// "[Object: null prototype]" base, getPrototypeOf answers null, `in` finds
// no inherited names, and ToPrimitive and Object.prototype methods throw.
// Copies (spread, structuredClone) and other index-signature records keep
// Object.prototype, and a record converted from Object.create(null) keeps
// its null prototype.
import * as util from "node:util";

const nums = [1, 2, 3, 4, 5];
const g = Object.groupBy(nums, (n) => (n % 2 ? "odd" : "even") as string);
console.log(g);
console.log(util.inspect(g), util.inspect({ nested: { g } }, { depth: 1 }));
console.log(Object.getPrototypeOf(g) === null);
console.log("toString" in g, "constructor" in g, "hasOwnProperty" in g);
const names = ["odd", "even", "valueOf", "__proto__", "none"];
for (const name of names) console.log(name, name in g);

const empty = Object.groupBy([] as number[], (n) => String(n));
console.log(empty, Object.keys(empty).length, util.inspect([empty]));

const attempt = (label: string, f: () => unknown): void => {
  try {
    console.log(label, f());
  } catch (e) {
    console.log(label, (e as Error).name, (e as Error).message);
  }
};
attempt("String", () => String(g));
attempt("template", () => `${g}`);
attempt("concat", () => "g=" + g);
attempt("toString", () => g.toString());
let evaluated = 0;
attempt("hasOwnProperty", () => g.hasOwnProperty((evaluated++, "odd")));
attempt("propertyIsEnumerable", () => g.propertyIsEnumerable("odd"));
console.log("argument evaluated", evaluated);
console.log(Object.prototype.toString.call(g), Object.hasOwn(g, "odd"));
console.log(Object.prototype.hasOwnProperty.call(g, "even"));
console.log(JSON.stringify(g), Object.keys(g), Object.entries(g).length);

const copy = { ...g };
console.log(copy, Object.getPrototypeOf(copy) === Object.prototype, "toString" in copy);
const cloned = structuredClone(g);
console.log(cloned, Object.getPrototypeOf(cloned) === Object.prototype);

const plain: Partial<Record<string, number[]>> = { odd: [1, 3, 5], even: [2, 4] };
console.log(plain, "toString" in plain, String(plain), plain.toString());
console.log(util.isDeepStrictEqual(g, plain), util.isDeepStrictEqual(copy, plain));

// The groups stay writable arrays and the record stays writable.
g.odd?.push(7);
g.extra = [0];
console.log(g, Object.keys(g));
const pass = (r: Partial<Record<string, number[]>>): string =>
  `${Object.getPrototypeOf(r) === null} ${"toString" in r}`;
console.log(pass(g), pass(plain));

// An index-signature record converted from Object.create(null) keeps the
// null prototype; one converted from a plain object does not.
const bare: Record<string, number> = Object.create(null);
bare.a = 1;
const parsed = JSON.parse('{"a":1}') as Record<string, number>;
console.log(bare, "toString" in bare, Object.getPrototypeOf(bare) === null);
console.log(parsed, "toString" in parsed, Object.getPrototypeOf(parsed) === null);
