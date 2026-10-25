import * as util from "node:util";
import { callbackify, debuglog, deprecate, inherits } from "node:util";

function Base(this: { label: string }, label: string): void {
  this.label = label;
}
function Derived(this: { label: string }, label: string): void {
  Base.call(this, label);
}
inherits(Derived, Base);
console.log(Reflect.get(Derived, "super_") === Base);

process.noDeprecation = true;
const add = deprecate((a: number, b: number): number => a + b, "add() is deprecated", "DEP_TYPES");
console.log(add(2, 3), process.noDeprecation);

const square: (n: number, callback: (err: NodeJS.ErrnoException | null, value: number) => void) => void =
  callbackify(async (n: number): Promise<number> => n * n);
square(9, (err, value) => {
  console.log("square", err, value);
});
const fail: (callback: (err: NodeJS.ErrnoException | null, value?: number) => void) => void = callbackify(async (): Promise<number | undefined> => {
  throw new RangeError("typed rejection");
});
fail((err, value) => {
  console.log("fail", err?.name, err?.message, value);
});

const log: util.DebugLogger = debuglog("node-types-fixture");
log("not written while NODE_DEBUG is unset");
console.log("enabled", log.enabled, util.debug === util.debuglog);
