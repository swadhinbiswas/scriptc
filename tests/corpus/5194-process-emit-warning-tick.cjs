// process.emitWarning emits on the next tick: argument errors still throw
// at the call, while the report and the 'warning' listeners run after the
// turn's synchronous output, in emission order and interleaved with other
// ticks the way Node's queue orders them (before promise reactions and
// immediates). Warnings emitted from a tick or a microtask follow the
// same rule, and a DeprecationWarning names --trace-deprecation in the
// one-time hint. The program re-runs itself and prints the child's
// output with process ids normalized.
"use strict";
const { spawnSync } = require("child_process");

if (process.argv[2] === "child") {
  process.on("warning", (w) => console.log("listener:", w.name, w.code, w.message, w.detail));
  try {
    process.emitWarning(42);
  } catch (e) {
    console.log("sync throw:", e.code);
  }
  process.emitWarning("first deprecation", "DeprecationWarning", "DEP_TICK_1");
  console.error("stderr during the turn");
  process.nextTick(() => {
    console.log("tick after the first warning");
    process.emitWarning("from a tick", { type: "TickWarning", detail: "with detail" });
  });
  Promise.resolve().then(() => {
    console.log("microtask");
    process.emitWarning("from a microtask");
  });
  setImmediate(() => console.log("immediate"));
  process.emitWarning("second", "CustomWarning", "CW_2");
  console.log("end of turn");
} else {
  const child = spawnSync(process.execPath, [process.argv[1], "child"], { encoding: "utf8" });
  console.log(`status: ${child.status}`);
  console.log(child.stdout);
  console.log(child.stderr.replace(/\(node:\d+\)/g, "(node:<pid>)"));
}
