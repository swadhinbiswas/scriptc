// url.parse() under process.throwDeprecation: DEP0169 and DEP0170 are
// thrown from their own ticks, after the turn's output and in order,
// instead of being reported, so they reach the 'uncaughtException'
// handler as DeprecationWarning errors with their codes, and no 'warning'
// listener sees them. Without a handler the first one ends the process
// with exit status 1. The program re-runs itself and prints each child's
// stdout and status.
"use strict";
const { spawnSync } = require("child_process");
const url = require("url");

const mode = process.argv[2];
if (mode === "handled") {
  process.on("warning", (warning) => console.log("listener:", warning.name));
  process.on("uncaughtException", (error) => {
    console.log("uncaught:", error.name, error.code, error instanceof Error);
    console.log(error.message);
  });
  process.throwDeprecation = true;
  console.log(url.parse("http://example.com:x/a").pathname);
  console.log(process.throwDeprecation, "end of turn");
} else if (mode === "unhandled") {
  process.throwDeprecation = true;
  console.log(url.parse("http://example.com/b").href);
  setTimeout(() => console.log("not reached"), 0);
} else {
  for (const child of ["handled", "unhandled"]) {
    const run = spawnSync(process.execPath, [process.argv[1], child], { encoding: "utf8" });
    console.log(`${child} status: ${run.status}`);
    console.log(run.stdout);
  }
}
