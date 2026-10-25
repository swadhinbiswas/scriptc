// Island operations inside async functions run on ucontext fibers — every
// entry re-anchors the engine's stack check (the fiber-safety contract).
// The ops after `await` run on a RESUMED fiber, the strictest case.
function tick(): Promise<number> {
  return new Promise<number>((resolve) => {
    setTimeout(() => {
      resolve(1);
    }, 1);
  });
}
async function work(seed: any): Promise<number> {
  const before = seed * 2; // island op during the synchronous prefix
  const bump = await tick();
  const v: any = { value: before, tag: `t${bump}` }; // island ops after resume
  console.log(`${v.tag}`);
  return (v.value as number) + bump;
}
async function main(): Promise<void> {
  const a = await work(21);
  const b = await work(a);
  console.log(a, b);
}
main();
console.log("sync prefix done");
