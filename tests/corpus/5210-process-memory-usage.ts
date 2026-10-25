// process.memoryUsage() and memoryUsage.rss(): Node's record shape and
// key order. rss comes from the OS and heapTotal/heapUsed from the heap's
// own accounting, so the raw numbers differ between runs and runtimes —
// print the invariants every implementation keeps.
const usage = process.memoryUsage();
console.log(Object.keys(usage));
console.log(Object.values(usage).every((n) => typeof n === "number" && Number.isInteger(n)));
console.log(usage.rss > 0, usage.heapTotal >= 0, usage.heapUsed >= 0);
console.log(usage.heapUsed <= usage.heapTotal);
console.log(usage.external >= 0, usage.arrayBuffers >= 0);

// Allocating keeps the heap figures consistent.
const rows: { id: number; label: string }[] = [];
for (let i = 0; i < 20000; i++) rows.push({ id: i, label: `row-${i}` });
const after = process.memoryUsage();
console.log(rows.length, after.heapUsed <= after.heapTotal, after.heapTotal > 0);

// rss() reads the resident set alone.
const rss = process.memoryUsage.rss();
console.log(typeof rss, Number.isInteger(rss), rss > 0);

// A formatter over the record, the usual reporting idiom.
const mb = (n: number): string => `${Math.max(0, Math.round(n / 1024 / 1024))} MB`;
for (const [key, value] of Object.entries(after)) {
  console.log(key.padEnd(12), mb(value).endsWith(" MB"));
}
