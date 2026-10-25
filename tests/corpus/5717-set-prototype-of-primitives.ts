// Object.setPrototypeOf with a primitive receiver: a boolean, number, string,
// bigint or symbol is returned unchanged when the prototype is an object or
// null, and a TypeError is thrown for any other prototype. A null or
// undefined receiver throws before the prototype is checked.

function attempt(label: string, receiver: unknown, prototype: unknown): void {
  try {
    const result: unknown = Object.setPrototypeOf(receiver, prototype as object | null);
    console.log(label, typeof result, result === receiver);
  } catch (error) {
    console.log(label, error instanceof TypeError, (error as Error).message.split(":")[0]);
  }
}

const symbol = Symbol("tag");
const receivers: [string, unknown][] = [
  ["true", true],
  ["false", false],
  ["number", 5],
  ["nan", NaN],
  ["string", "text"],
  ["empty", ""],
  ["bigint", 10n],
  ["symbol", symbol],
];
const prototypes: [string, unknown][] = [
  ["object", { inherited: 1 }],
  ["array", [1, 2]],
  ["null", null],
  ["number", 7],
  ["undefined", undefined],
];

for (const [receiverLabel, receiver] of receivers) {
  for (const [prototypeLabel, prototype] of prototypes) {
    attempt(`${receiverLabel}/${prototypeLabel}`, receiver, prototype);
  }
}

attempt("null/object", null, {});
attempt("null/number", null, 7);
attempt("undefined/object", undefined, {});
attempt("undefined/null", undefined, null);

const parsed: unknown = JSON.parse('{"own":1}');
const proto = { inherited: 2 };
const linked: unknown = Object.setPrototypeOf(parsed, proto);
const fields = linked as { own: number; inherited: number };
console.log("object", linked === parsed, fields.own, fields.inherited);
attempt("object/number", parsed, 7);

const value: unknown = "abc";
const same = Object.setPrototypeOf(value, null);
console.log("string length", (same as string).length, same === "abc");
