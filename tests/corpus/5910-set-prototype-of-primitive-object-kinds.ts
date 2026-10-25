// Object.setPrototypeOf with a statically typed primitive receiver returns the
// receiver unchanged when the prototype is any object or function: a class
// instance, a class, a Map, a typed array, a promise, an arrow function or
// Object.prototype. A prototype that is not an object or null throws a
// TypeError.

class Base {
  hello(): string {
    return "base";
  }
}

function plain(): number {
  return 1;
}

function show(label: string, result: unknown, receiver: unknown): void {
  console.log(label, typeof result, Object.is(result, receiver));
}

const prototypes: [string, object | null][] = [
  ["literal", { inherited: 1 }],
  ["instance", new Base()],
  ["class", Base],
  ["function", plain],
  ["arrow", () => 2],
  ["array", [1, 2]],
  ["map", new Map<string, number>()],
  ["set", new Set<number>()],
  ["regexp", /a/],
  ["bytes", new Uint8Array(2)],
  ["promise", Promise.resolve(1)],
  ["error", new Error("e")],
  ["null-proto", Object.create(null) as object],
  ["object-prototype", Object.prototype],
  ["null", null],
];

const symbol = Symbol("tag");
for (const [label, prototype] of prototypes) {
  show(`number/${label}`, Object.setPrototypeOf(5, prototype), 5);
  show(`negative-zero/${label}`, Object.setPrototypeOf(-0, prototype), -0);
  show(`string/${label}`, Object.setPrototypeOf("text", prototype), "text");
  show(`boolean/${label}`, Object.setPrototypeOf(false, prototype), false);
  show(`bigint/${label}`, Object.setPrototypeOf(10n, prototype), 10n);
  show(`symbol/${label}`, Object.setPrototypeOf(symbol, prototype), symbol);
}

const proto = { greet(): string { return "hi"; } };
const five = Object.setPrototypeOf(5, proto);
console.log(five, typeof five);
let count: number = 3.5;
count = Object.setPrototypeOf(count, proto);
console.log(count + 1);

for (const invalid of [7, "proto", true, undefined]) {
  try {
    Object.setPrototypeOf(5, invalid as unknown as object);
    console.log("no throw", typeof invalid);
  } catch (error) {
    console.log(typeof invalid, error instanceof TypeError);
  }
}
