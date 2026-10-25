// @exit: 7
// Exit listeners see the program's exit code while top-level await is still
// pending, and a listener's process.exitCode is the final status.
process.exitCode = 5;
process.on("exit", (code) => {
  console.log("exit", code);
  process.exitCode = 7;
});
await new Promise<void>(() => {});

export {};
