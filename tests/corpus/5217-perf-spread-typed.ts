// Spread arguments to the performance timeline from typed code: tuple
// spreads expand in source order, alone or next to positional arguments,
// before the timeline validates them.
const mark: [string, { startTime: number }] = ["typed", { startTime: 5 }];
console.log(performance.mark(...mark).startTime);

const name: [string] = ["second"];
console.log(performance.mark(...name, { startTime: 6 }).name);

const pair = ["typed-span", "typed"] as const;
const measure = performance.measure(...pair, "second");
console.log(measure.name, measure.entryType, measure.duration);

const byName: [string] = ["typed"];
console.log(performance.getEntriesByName(...byName).map((e) => e.startTime));
const byType = ["measure"] as const;
console.log(performance.getEntriesByType(...byType).map((e) => e.name));
const clear: [string] = ["typed"];
performance.clearMarks(...clear);
console.log(
  performance
    .getEntriesByType("mark")
    .map((e) => e.name)
    .join(","),
);
const empty: [] = [];
console.log(performance.getEntries(...empty).length);
