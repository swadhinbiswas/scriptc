/* The merve-port probe battery: every case here was probed against real
 * Node v24.15.0 (import the CJS from ESM, read the namespace's own keys —
 * the lexed set materializes as bindings whether or not evaluation ever
 * assigns them), and the expectations below are Node's answers byte for
 * byte. The battery exists to keep cjs-lexer.ts pinned to the ORACLE, not
 * to any npm lexer: cjs-module-lexer 2.2.0 disagrees with Node on several
 * of these (the phantom "get" for identifier-named table getters, missed
 * `k: require(…)` value reexports, defineProperty poisoning, `require (`
 * spacing) and each disagreement is called out inline. */
import { describe, expect, test } from "vitest";
import { cjsLexedExportsOf, cjsLexerVisibleNames } from "../src/frontend/cjs-lexer.js";

import { cjsLexerCases as cases } from "./cjs-lexer-cases.js";

describe("cjs-lexer answers Node's vendored lexer, shape by shape", () => {
  test.for(cases.map((c) => [c.name, c] as const))("%s", ([, c]) => {
    const lexed = cjsLexedExportsOf(c.src, "probe.cjs");
    expect([...lexed.exports].sort()).toEqual(c.exports);
    expect(lexed.reexports).toEqual(c.reexports ?? []);
  });
});

describe("cjsLexerVisibleNames unions CJS reexport targets", () => {
  const graph: Record<string, string> = {
    entry: `module.exports = require("./mid");\nmodule.exports.own = 1;`,
    mid: `exports.midName = 1;\nmodule.exports = require("./entry");\n__exportStar(require("./leaf"), exports);\nvar __exportStar = 0;`,
    leaf: `exports.leafName = 1;`,
  };
  const resolve = (_from: string, spec: string): string | null => {
    const key = spec.replace("./", "");
    return key in graph ? key : null;
  };

  test("names union through chains and cycles converge", () => {
    const names = cjsLexerVisibleNames("entry", (k) => graph[k]!, resolve);
    expect([...names].sort()).toEqual(["leafName", "midName", "own"]);
  });

  test("unresolvable targets contribute nothing", () => {
    const names = cjsLexerVisibleNames(
      "mid",
      (k) => graph[k]!,
      (_f, spec) => (spec === "./leaf" ? "leaf" : null),
    );
    expect([...names].sort()).toEqual(["leafName", "midName"]);
  });
});
