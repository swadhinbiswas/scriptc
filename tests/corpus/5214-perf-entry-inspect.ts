// How performance entries print: util.inspect's PerformanceMark /
// PerformanceMeasure form (a nested inspect of toJSON() one level
// shallower), JSON.stringify through toJSON, and toJSON itself.
import { inspect } from "node:util";
import { performance, type PerformanceEntry } from "node:perf_hooks";

const mark = performance.mark("load", { startTime: 1.5, detail: { a: { b: { c: 1 } } } });
const measure = performance.measure("load-done", { start: "load", end: 4 });
console.log(mark);
console.log(measure);
console.log([mark, measure]);
console.log({ first: mark });
console.log({ deep: { deeper: { deepest: mark } } });
console.log(inspect(mark, { depth: 0 }));
console.log(inspect(mark, { depth: Infinity }));
console.log(`${inspect(measure)}`.split("\n").length);

console.log(String(mark), `${measure}`, mark.toString(), "entry: " + measure);
console.log(JSON.stringify(mark));
console.log(JSON.stringify(performance.getEntries()));
console.log(JSON.stringify({ entries: performance.getEntriesByType("measure") }, null, 2));
console.log(mark.toJSON());
console.log(Object.keys(mark.toJSON()));

// Entries flow through typed collections like any record.
const byName = new Map<string, PerformanceEntry>();
for (const entry of performance.getEntries()) byName.set(entry.name, entry);
console.log([...byName.keys()], byName.get("load-done")!.duration);
const total = performance
  .getEntriesByType("measure")
  .reduce((sum, entry) => sum + entry.duration, 0);
console.log(total);
