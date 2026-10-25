// Module-scope PATTERN bindings over island-bound sources store HANDLES:
// a file-scope `export let { toString } = 1` extracts the wrapper's
// prototype member in the engine, and the global slot follows the island
// property-read rule (declared primitives exit eagerly, everything else
// stays a handle) — a func-typed slot could never take the engine value.
export let { toString } = 1;
export const { toFixed } = 2.5;
console.log(`${typeof toString} ${typeof toFixed}`);
const { length: strLen } = "abcd";
console.log(strLen);
console.log("done");
