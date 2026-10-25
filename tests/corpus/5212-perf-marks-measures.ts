// performance.mark / measure and the performance timeline, with explicit
// timestamps so every number is deterministic.
import { performance } from "node:perf_hooks";

const a = performance.mark("start", { startTime: 10 });
console.log(a.name, a.entryType, a.startTime, a.duration, a.detail);
const b = performance.mark("end", { startTime: 25.5, detail: { step: "end", n: [1, 2] } });
console.log(b.startTime, b.detail);

// Between two marks, from a mark to a timestamp, and with a duration.
const m1 = performance.measure("start-end", "start", "end");
console.log(m1.name, m1.entryType, m1.startTime, m1.duration, m1.detail);
const m2 = performance.measure("opts", { start: "start", end: 40, detail: "d" });
console.log(m2.startTime, m2.duration, m2.detail);
const m3 = performance.measure("dur", { start: 5, duration: 3 });
console.log(m3.startTime, m3.duration);
const m4 = performance.measure("back", { end: "end", duration: 0.5 });
console.log(m4.startTime, m4.duration);
const m5 = performance.measure("numbers", { start: 1, end: 2 });
console.log(m5.startTime, m5.duration);

// The timeline: marks then measures, sorted by startTime (stable).
const line = (e: { name: string; entryType: string; startTime: number }): string =>
  `${e.entryType}:${e.name}@${e.startTime}`;
console.log(performance.getEntries().map(line));
console.log(performance.getEntriesByType("mark").map(line));
console.log(performance.getEntriesByType("measure").map((e) => e.name));
console.log(performance.getEntriesByName("start").map(line));
console.log(performance.getEntriesByName("start", "measure").length);
console.log(performance.getEntriesByName("start-end", "measure")[0]!.duration);

// The getters answer the same objects mark() and measure() returned.
console.log(performance.getEntriesByName("start-end")[0] === m1);
console.log(performance.getEntries().includes(a), performance.getEntriesByType("mark")[1] === b);

// A later mark with the same name moves the name's time.
performance.mark("start", { startTime: 20 });
console.log(performance.measure("again", "start", "end").duration);
console.log(performance.getEntriesByName("start").length);

// Details are cloned at mark time.
const detail = { count: 1 };
const c = performance.mark("cloned", { startTime: 30, detail });
detail.count = 2;
console.log(c.detail, c.detail === c.detail);

// Clearing by name, then everything.
performance.clearMarks("start");
console.log(performance.getEntriesByType("mark").map((e) => e.name));
performance.clearMeasures("dur");
console.log(performance.getEntriesByType("measure").map((e) => e.name));
performance.clearMeasures();
console.log(performance.getEntriesByType("measure").length);
performance.clearMarks();
console.log(performance.getEntries().length);

// The live clock: marks without a startTime read performance.now().
const before = performance.now();
const live = performance.mark("live");
const span = performance.measure("since-live", "live");
console.log(live.startTime >= before, span.duration >= 0, span.startTime === live.startTime);
const fromOrigin = performance.measure("from-origin");
console.log(fromOrigin.startTime, fromOrigin.duration >= live.startTime);
