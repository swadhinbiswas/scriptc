// The global console's counters and groups: count/countReset over the
// default label and string, optional, computed, and template labels;
// group/groupCollapsed with and without label arguments (a format string
// included), nesting, and the extra groupEnd at depth zero. Every console
// line inside a group is indented, multi-line output and stderr included:
// log, info, debug, error, warn, dir, dirxml, table, count, and assert.
import { count, group, groupEnd } from "node:console";
import * as nodeConsole from "node:console";

console.count();
console.count("default");
console.count("apples");
console.count(`apples`);
console.count("7");
console.count(undefined);
console.countReset();
console.count();
console.countReset("apples");
console.count("apples");

function labelOf(n: number): string {
  console.log("evaluating label", n);
  return `label-${n}`;
}
console.count(labelOf(1));
console.count(labelOf(1));

const maybe: string | undefined = process.argv.length > 99 ? "never" : undefined;
console.count(maybe);

console.log("top");
console.group();
console.log("one level");
console.group("Label %s #%d", "group", 2, { extra: true });
console.log("two levels\nsecond line\n\nfourth line");
console.info({ nested: { deep: [1, 2, 3] } });
console.debug("debug", 1.5, -0, true);
console.error("to stderr");
console.warn("warned\nover two lines");
console.dir({ a: { b: { c: { d: 1 } } } });
console.dirxml("dirxml", [1, 2]);
console.table([{ x: 1 }, { x: 2, y: "z" }]);
console.count("inside");
console.assert(false, "assertion inside a group");
console.groupCollapsed();
console.log("three levels");
console.groupEnd();
console.groupEnd();
console.log("back to one");
console.groupEnd();
console.groupEnd();
console.groupEnd();
console.log("top again");

group("imported");
count("imported");
nodeConsole.group("namespace");
nodeConsole.count("imported");
nodeConsole.groupEnd();
groupEnd();
console.log("done");
