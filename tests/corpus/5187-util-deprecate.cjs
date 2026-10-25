// util.deprecate: the wrapper warns once, then keeps calling through; a
// code warns once across every wrapper sharing it, while wrappers without
// a code warn independently. Warnings are reported after the turn's own
// output, the default report before the program's 'warning' listener,
// with Node's one-time --trace-deprecation hint. The wrapper forwards
// `this` and arguments, links its prototype chain and `prototype` to the
// wrapped constructor, copies its length, and keeps the wrapped
// function's static members reachable; modifyPrototype: false skips that.
// The "ExperimentalWarning" code reports an ExperimentalWarning, an Error
// message is reported as itself, and argument errors match Node. The
// program re-runs itself and prints the child's output with process ids
// normalized.
"use strict";
const { spawnSync } = require("child_process");
const util = require("util");

function attempt(label, run) {
  try {
    const result = run();
    console.log(label, typeof result);
    return result;
  } catch (e) {
    console.log(label, e.name, e.code, e.message);
    return undefined;
  }
}

if (process.argv[2] === "child") {
  process.on("warning", (w) => console.log("listener:", w.name, w.code, w.message));
  const add = util.deprecate(function add(a, b) {
    return a + b;
  }, "add() is deprecated", "DEP_CORPUS_1");
  console.log("add", add(1, 2), add(3, 4), add.name, add.length);
  const sameCode = util.deprecate(() => "same code", "never reported", "DEP_CORPUS_1");
  console.log(sameCode());
  const uncoded = util.deprecate(() => "uncoded", "uncoded() is deprecated");
  console.log(uncoded(), uncoded());
  const uncodedTwin = util.deprecate(() => "twin", "uncoded() is deprecated");
  console.log(uncodedTwin());
  const holder = {
    factor: 9,
    scaled: util.deprecate(function (n) {
      return n * this.factor;
    }, "scaled() is deprecated", "DEP_CORPUS_2"),
  };
  console.log("this", holder.scaled(2));

  function Point(x, y) {
    this.x = x;
    this.y = y;
  }
  Point.prototype.sum = function () {
    return this.x + this.y;
  };
  Point.origin = "origin";
  const LegacyPoint = util.deprecate(Point, "Point is deprecated", "DEP_CORPUS_3");
  const p = new LegacyPoint(2, 5);
  console.log(p.sum(), Object.getPrototypeOf(p) === Point.prototype, LegacyPoint.prototype === Point.prototype);
  console.log(LegacyPoint.origin, LegacyPoint.length, LegacyPoint.name, Object.getPrototypeOf(LegacyPoint) === Point);

  const unlinked = util.deprecate(function unlinked(a, b, c) {
    return a + b + c;
  }, "unlinked() is deprecated", undefined, { modifyPrototype: false });
  console.log("unlinked", unlinked(1, 2, 3), unlinked.length);

  const experimental = util.deprecate(() => "experimental", "an experimental helper", "ExperimentalWarning");
  console.log(experimental(), experimental());
  const errorMessage = util.deprecate(() => "error message", new TypeError("custom warning type"), "DEP_CORPUS_4");
  console.log(errorMessage());

  attempt("null options", () => util.deprecate(() => 1, "m", undefined, null));
  attempt("numeric code", () => util.deprecate(() => 1, "m", 5));
  attempt("string fn", () => util.deprecate("abc", "m"));
  attempt("undefined fn", () => util.deprecate(undefined, "m"));
  attempt("null fn", () => util.deprecate(null, "m"));
  attempt("object fn call", () => util.deprecate({}, "object fn is deprecated")());
  attempt("missing message call", () => util.deprecate(() => 1)());
  attempt("numeric message call", () => util.deprecate(() => 1, 42, "DEP_CORPUS_5")());
  console.log("end of turn");
  process.nextTick(() => console.log("tick queued after the calls"));
} else {
  const child = spawnSync(process.execPath, [process.argv[1], "child"], { encoding: "utf8" });
  console.log(`status: ${child.status}`);
  console.log(child.stdout);
  console.log(child.stderr.replace(/\(node:\d+\)/g, "(node:<pid>)"));
}
