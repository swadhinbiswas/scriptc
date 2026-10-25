// util.deprecate from TypeScript: the wrapper keeps the wrapped
// function's static type, so typed arguments and results pass through,
// it is callable from a stored value, and it warns once per code and once
// per uncoded wrapper on the next tick, report first and then the
// program's typed 'warning' listener. process.noDeprecation is a typed
// boolean property. The program re-runs itself and prints the child's
// output with process ids normalized.
import { spawnSync } from "node:child_process";
import * as util from "node:util";
import { deprecate } from "node:util";

if (process.argv[2] === "child") {
  process.on("warning", (warning: Error) => {
    console.log(`listener: ${warning.name}: ${warning.message}`);
  });
  const format = deprecate(
    (label: string, count: number): string => `${label}=${count}`,
    "format() is deprecated",
    "DEP_TS_1",
  );
  const formatted: string[] = [];
  for (let i = 0; i < 3; i++) formatted.push(format("item", i));
  console.log(formatted.join(", "));
  const total = util.deprecate((values: number[]): number => values.reduce((a, b) => a + b, 0), "total() is deprecated");
  const stored: (values: number[]) => number = total;
  console.log(stored([1, 2, 3]), total([10]));
  const sameCode = util.deprecate((): boolean => true, "never reported", "DEP_TS_1");
  console.log(sameCode());
  const maybe = deprecate((value?: string): string => value ?? "none", "maybe() is deprecated", "DEP_TS_2");
  console.log(maybe(), maybe("given"));
  process.noDeprecation = true;
  const quiet = deprecate((): string => "quiet", "quiet() is deprecated", "DEP_TS_3");
  console.log(quiet(), process.noDeprecation === true);
  process.noDeprecation = false;
  console.log("end of turn");
} else {
  const child = spawnSync(process.execPath, [process.argv[1]!, "child"], { encoding: "utf8" });
  console.log(`status: ${child.status}`);
  console.log(child.stdout);
  console.log(child.stderr.replace(/\(node:\d+\)/g, "(node:<pid>)"));
}
