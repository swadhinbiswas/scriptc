// process.noDeprecation and process.throwDeprecation as util.deprecate
// and process.emitWarning observe them: both read undefined until
// assigned and keep the assigned value; while noDeprecation is truthy a
// deprecated call neither warns nor uses up its one warning, and a
// DeprecationWarning emitted directly is dropped; while throwDeprecation
// is truthy the warning is thrown from its own tick (reaching
// 'uncaughtException') instead of being reported. Other warning types
// are unaffected, and every warning is emitted after the turn's own
// output. The program re-runs itself and prints the child's output with
// process ids normalized.
"use strict";
const { spawnSync } = require("child_process");
const util = require("util");

if (process.argv[2] === "child") {
  console.log("initial", process.noDeprecation, process.throwDeprecation);
  process.on("warning", (w) => console.log("listener:", w.name, w.code, w.message));
  const first = util.deprecate(() => "first", "first() is deprecated");
  process.noDeprecation = true;
  console.log("silenced", process.noDeprecation, first(), first());
  process.emitWarning("direct deprecation while silenced", "DeprecationWarning", "DEP_FLAG_1");
  process.emitWarning("ordinary warning while silenced");
  process.noDeprecation = 0;
  console.log("restored", process.noDeprecation, first());
  const second = util.deprecate(() => "second", "second() is deprecated", "DEP_FLAG_2");
  console.log(second());
  process.emitWarning("direct deprecation", "DeprecationWarning", "DEP_FLAG_3");
  console.error("stderr written during the turn");
  process.on("uncaughtException", (e) => {
    console.log("uncaught:", e.name, e.code, e.message, e instanceof Error);
  });
  process.throwDeprecation = "yes";
  const third = util.deprecate(() => "third", "third() is deprecated", "DEP_FLAG_4");
  console.log(third(), process.throwDeprecation);
  process.emitWarning("thrown direct deprecation", { type: "DeprecationWarning", code: "DEP_FLAG_5" });
  process.emitWarning("ordinary warning while throwing", "CustomWarning");
  console.log("end of turn");
} else {
  const child = spawnSync(process.execPath, [process.argv[1], "child"], { encoding: "utf8" });
  console.log(`status: ${child.status}`);
  console.log(child.stdout);
  console.log(child.stderr.replace(/\(node:\d+\)/g, "(node:<pid>)"));
}
