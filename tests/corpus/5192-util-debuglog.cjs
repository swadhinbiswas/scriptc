// util.debuglog: sections match NODE_DEBUG as the process started (comma
// lists, '*' wildcards, case-insensitive, other regexp syntax literal),
// so a later process.env write changes nothing. Enabled loggers write
// "SECTION PID: message" lines to stderr with util.format's substitutions
// and inspected extra arguments; `enabled` is an enumerable getter; the
// callback receives the section's shared implementation (with its own
// `enabled`) on the first call; util.debug is the same function; and an
// enabled http section warns about sensitive data. The program re-runs
// itself under several NODE_DEBUG values and prints the child's output
// with process ids normalized.
"use strict";
const { spawnSync } = require("child_process");
const util = require("util");

if (process.argv[2] === "child") {
  process.env.NODE_DEBUG = "changed-at-runtime";
  const foo = util.debuglog("foo");
  console.log("foo enabled", foo.enabled, Object.keys(foo), foo.name);
  console.log(typeof Object.getOwnPropertyDescriptor(foo, "enabled").get);
  foo("plain message");
  foo("format %s %d %i %f %j %o %O %c %% done", "str", 42, "17.9px", "2.5e1x", { a: [1, 2] }, 7, { b: { c: { d: 1 } } }, "css");
  foo("extra", 1, { k: "v" }, [1, 2], null, undefined, true, -0);
  foo({ first: "object" }, "then string");
  foo("%s and %s", { toString() { return "custom toString"; } }, { plain: true });
  foo("%d %d %d %i", 10n, Symbol("s"), "abc", 2n);
  foo("missing %s %s", "only-one");
  foo("100%");
  const barBaz = util.debuglog("bar-baz", (fn) => {
    console.log("callback", typeof fn, fn.name, fn.enabled);
  });
  barBaz("first %s", "call");
  barBaz("second call");
  const other = util.debuglog("other");
  console.log("other enabled", other.enabled);
  other("other message");
  const upper = util.debug("FOO");
  upper("same section through util.debug");
  const quiet = util.debuglog("quiet", (fn) => console.log("quiet callback", fn.name, fn.enabled));
  quiet("quiet message");
  console.log("quiet enabled", quiet.enabled);
  const http = util.debuglog("http");
  http("request %s", "/path");
  console.log(util.debug === util.debuglog, util.debuglog.name, util.debuglog.length);
  console.log("end of turn");
} else {
  for (const env of ["foo,bar-*,HTTP", "", "fo*,Quiet", "o?her,[x],BAR-BAZ", "OTHER"]) {
    process.env.NODE_DEBUG = env;
    const child = spawnSync(process.execPath, [process.argv[1], "child"], { encoding: "utf8" });
    console.log(`NODE_DEBUG=${JSON.stringify(env)} status: ${child.status}`);
    console.log(child.stdout);
    console.log(child.stderr.replace(/^([A-Z0-9-]+) \d+: /gm, "$1 <pid>: ").replace(/\(node:\d+\)/g, "(node:<pid>)"));
  }
}
