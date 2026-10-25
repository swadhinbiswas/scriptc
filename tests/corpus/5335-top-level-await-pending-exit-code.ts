// @exit: 5
// A nonzero process.exitCode outranks the unsettled-top-level-await status.
process.exitCode = 5;
console.log("pending with exit code");
await new Promise<void>(() => {});
console.log("unreachable");

export {};
