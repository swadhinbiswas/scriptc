// @exit: 1
// An uncaught stack-overflow RangeError ends the process with Node's
// uncaught exit code; output written before it still matches.
function climb(n: number): number {
  return climb(n + 1) + 1;
}
console.log("start");
try {
  climb(0);
} catch (e) {
  console.log("first", (e as Error).name);
}
process.on("exit", (code) => console.log("exit", code));
console.log("again");
climb(0);
console.log("unreachable");
