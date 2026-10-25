import vm from "node:vm";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/** The Node client's compile-time evaluator. Only source text and the
 * resulting value cross this boundary; TS5 ASTs never enter the frontend.
 * Every invocation gets fresh globals and a bounded execution window. */
export function evaluateNodeComptime(source: string, timeoutMs: number): unknown {
  const ts5 = require("typescript5") as typeof import("typescript5");
  const js = ts5.transpileModule(`(${source})()`, {
    compilerOptions: { target: ts5.ScriptTarget.ESNext },
  }).outputText;
  // Shadow V8's per-context console, which otherwise produces no output.
  // The capture walk rejects direct console references before evaluation.
  return vm.runInNewContext(js, { console: undefined }, { timeout: timeoutMs });
}
