// url.parse() under process.noDeprecation: while it is truthy, the DEP0169
// and DEP0170 warnings are dropped (no report, no 'warning' listener call),
// and each still uses up its one warning, so clearing the flag later
// reports neither. Other warnings are unaffected. A second child sets the
// flag after the first url.parse() call, in the same turn: the queued
// warning still reaches the 'warning' listener, and the stderr report,
// which reads the flag when the tick runs, is skipped. The program re-runs
// itself and prints each child's output with process ids normalized.
"use strict";
const { spawnSync } = require("child_process");
const url = require("url");

const mode = process.argv[2];
if (mode === "silenced") {
  process.on("warning", (w) => console.log("listener:", w.name, w.code, w.message));
  process.noDeprecation = true;
  console.log(url.parse("http://example.com:8080/a").port);
  console.log(url.parse("http://example.com:x/b").pathname);
  process.emitWarning("ordinary warning while silenced");
  setTimeout(() => {
    process.noDeprecation = false;
    console.log(url.parse("http://example.com:y/c").hostname, process.noDeprecation);
    process.emitWarning("direct deprecation after restore", "DeprecationWarning", "DEP_URL_1");
  }, 0);
} else if (mode === "late") {
  process.on("warning", (w) => console.log("listener:", w.name, w.code));
  console.log(url.parse("http://example.com/late").path);
  process.noDeprecation = 1;
  console.log("end of turn", process.noDeprecation);
} else {
  for (const child of ["silenced", "late"]) {
    const run = spawnSync(process.execPath, [process.argv[1], child], { encoding: "utf8" });
    console.log(`${child} status: ${run.status}`);
    console.log(run.stdout);
    console.log(run.stderr.replace(/\(node:\d+\)/g, "(node:<pid>)"));
  }
}
