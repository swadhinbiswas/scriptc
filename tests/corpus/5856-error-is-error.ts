// Error.isError over class instances, unknown values, catch bindings, unions
// and computed arguments: errors and subclasses of Error answer true, objects
// that only look like errors answer false. Node.js prints the same.
import { readFileSync } from "node:fs";

class Plain {
  message = "m";
  name = "Error";
}
class AppError extends Error {}
class DeepError extends AppError {}

function check(label: string, v: unknown): void {
  console.log(label, Error.isError(v));
}
check("Error", new Error("a"));
check("TypeError", new TypeError("t"));
check("subclass", new DeepError("d"));
check("AggregateError", new AggregateError([new Error("x")], "agg"));
check("DOMException", new DOMException("d", "AbortError"));
check("SuppressedError", new SuppressedError(new Error("a"), new Error("b"), "s"));
check("plain class", new Plain());
check("record", { message: "x", name: "Error" });
check("string", "Error");
check("undefined", undefined);
check("array of errors", [new Error("in array")]);
check("parsed", JSON.parse('{"message":"x","name":"Error"}'));

console.log("direct", Error.isError(new AppError("x")), Error.isError(null), Error.isError(42));
console.log("map", Error.isError(new Map()), Error.isError(/x/), Error.isError(Promise.resolve(1)));

try {
  readFileSync("/no/such/file");
} catch (e) {
  console.log("caught fs", Error.isError(e));
  if (Error.isError(e)) console.log("narrowed", e.name, e.message.split(":")[0]);
}
try {
  JSON.parse("{");
} catch (e) {
  console.log("caught syntax", Error.isError(e), e instanceof SyntaxError);
}
try {
  throw "text";
} catch (e) {
  console.log("caught string", Error.isError(e));
}
try {
  throw new Plain();
} catch (e) {
  console.log("caught plain", Error.isError(e));
}

const values: (AppError | Plain | string)[] = [new AppError("x"), new Plain(), "s"];
for (const v of values) console.log("union", Error.isError(v));
const maybe: Error | undefined = values.length > 5 ? new Error("never") : undefined;
console.log("optional", Error.isError(maybe));
const errors: Error[] = [new RangeError("r")];
console.log("element", Error.isError(errors[0]), Error.isError(errors));
console.log("mapped", [new Error("e"), 1, "s"].map((v) => Error.isError(v)).join(","));

let calls = 0;
function make(): Plain {
  calls++;
  return new Plain();
}
console.log("computed", Error.isError(make()), calls);

function describe(x: unknown): string {
  return Error.isError(x) ? `${x.name}: ${x.message}` : `not an error: ${String(x)}`;
}
console.log(describe(new RangeError("out of range")));
console.log(describe(5));

Promise.reject(new TypeError("rejected")).catch((r: unknown) => {
  console.log("rejection", Error.isError(r));
});
