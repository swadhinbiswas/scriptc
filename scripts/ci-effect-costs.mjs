#!/usr/bin/env node
// Refreshes tests/harness/effect-costs.json and tests/harness/effect4-costs.json from the logs of the Effect shards
// of green CI runs on main.
//
// Usage: node scripts/ci-effect-costs.mjs <job log> ...
//
// Each log is a downloaded "test (Linux, plain|san, Effect i/n)" job log. vitest prints every fixture test with its
// duration; for each fixture this takes the median over the logs of each flavor and stores the plain and sanitized
// medians' sum in seconds. Both flavors shard with the same table. Fixtures without a measurement in both flavors
// keep their current value; fixtures that no longer exist are removed.
import { globSync, readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";

const suites = {
  effect: {
    table: new URL("../tests/harness/effect-costs.json", import.meta.url),
    fixtures: new URL("../tests/fixtures/effect/", import.meta.url),
  },
  effect4: {
    table: new URL("../tests/harness/effect4-costs.json", import.meta.url),
    fixtures: new URL("../tests/fixtures/effect4/", import.meta.url),
  },
};
const samples = { effect: {}, effect4: {} };
for (const log of process.argv.slice(2)) {
  // Logs keep the terminal color codes (ESC [ ... m); drop them before matching.
  const text = readFileSync(log, "utf8")
    .replaceAll(String.fromCharCode(27), "")
    .replace(/\[[0-9;]*m/g, "");
  const flavor = /SCRIPTC_SAN: 1\b/.test(text) ? "san" : "plain";
  for (const m of text.matchAll(
    /✓ published Effect (?:4 )?\S*\/(effect4?)\/([^/\s]+\.ts) matches Node statically {2}(\d+)ms$/gm,
  ))
    (samples[m[1]][m[2]] ??= { plain: [], san: [] })[flavor].push(Number(m[3]));
}
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
let updated = 0;
for (const [suite, { table: path, fixtures }] of Object.entries(suites)) {
  const table = JSON.parse(readFileSync(path, "utf8"));
  const names = globSync("*.ts", { cwd: fixtures })
    .filter((file) => !file.endsWith(".d.ts"))
    .map((file) => basename(file))
    .sort();
  const next = {};
  for (const name of names) {
    const measured = samples[suite][name];
    if (measured?.plain.length && measured.san.length) {
      next[name] = Math.max(1, Math.round((median(measured.plain) + median(measured.san)) / 1000));
      updated++;
    } else if (table[name] !== undefined) next[name] = table[name];
  }
  writeFileSync(path, JSON.stringify(next, null, 2) + "\n");
}
console.log(`updated ${updated} fixture costs`);
