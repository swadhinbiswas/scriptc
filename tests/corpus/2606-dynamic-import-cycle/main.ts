// Dynamic import() into a benign import cycle: ping.ts and pong.ts are
// mutually-recursive modules reachable ONLY through import(), so the
// static preflight never sees them — the --dynamic subgraph walk
// (appendDynamicImportModules) judges the cycle with the same admission
// engine and admits it: declaration-only top levels, cycle-crossing
// bindings called only inside function bodies. The run-once init guards
// reproduce Node's cache-hit evaluation of the pair on the microtask.
async function main(): Promise<void> {
  console.log("start");
  const ns = await import("./ping.ts");
  console.log(ns.ping(5));
  console.log(ns.ping(0));
  const again = await import("./pong.ts");
  console.log(again.pong(2));
}
main();
console.log("after main() call");
