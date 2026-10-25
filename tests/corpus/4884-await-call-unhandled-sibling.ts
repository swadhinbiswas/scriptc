// @exit: 1
// A rejection from a directly awaited async call is handled by that await,
// while the same function's rejected promise left unawaited still reports
// as an unhandled rejection after the microtask queue drains.
async function fails(n: number): Promise<number> {
  if (n > 0) throw new Error("fail " + n);
  return n;
}
async function main(): Promise<void> {
  try {
    await fails(1);
  } catch (e) {
    console.log("handled", (e as Error).message);
  }
  process.on("unhandledRejection", (reason) => {
    console.log("unhandled", (reason as Error).message);
    process.exitCode = 1;
  });
  void fails(2);
  console.log("after", await fails(0));
}
void main();
