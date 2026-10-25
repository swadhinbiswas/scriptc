#!/usr/bin/env node
// Refreshes scripts/ci-test-costs.json and tests/harness/npm-static-costs.json from the logs of the Linux test
// shards of green CI runs on main.
//
// Usage: node scripts/ci-test-costs.mjs <job log> ...
//
// Each log is a downloaded "test (Linux, plain|san, i/n)" job log. vitest prints every test file it ran with its
// duration, and every test slower than its threshold with its duration. ci-test-costs.json stores, for each file
// that runs whole in the side queue (not the case-sharded corpus, Effect, coverage, cache and npm-static suites),
// the median over the logs of its flavor; npm-static-costs.json stores the median of each npm-static test. Entries
// without a new measurement keep their value; files the side queue no longer runs whole are removed.
import { readFileSync, writeFileSync } from "node:fs";
import { fileExclusions, isolatedFiles } from "./ci-test-plan.mjs";

const filePath = new URL("./ci-test-costs.json", import.meta.url);
const npmStaticPath = new URL("../tests/harness/npm-static-costs.json", import.meta.url);
const tables = {
  files: JSON.parse(readFileSync(filePath, "utf8")),
  npmStatic: JSON.parse(readFileSync(npmStaticPath, "utf8")),
};
const skipped = new Set(
  fileExclusions.filter((file) => !isolatedFiles.some(([, isolated]) => isolated === file)),
);
const samples = { files: { plain: {}, san: {} }, npmStatic: { plain: {}, san: {} } };
for (const log of process.argv.slice(2)) {
  // Logs keep the terminal color codes (ESC [ ... m); drop them before matching.
  const text = readFileSync(log, "utf8")
    .replaceAll(String.fromCharCode(27), "")
    .replace(/\[[0-9;]*m/g, "");
  const flavor = /SCRIPTC_SAN: 1\b/.test(text) ? "san" : "plain";
  for (const line of text.split("\n")) {
    let m = /^\S+ {2}✓ (\S+\.test\.ts) \(\d+ tests?[^)]*\) (\d+)ms$/.exec(line);
    if (m && !skipped.has(m[1])) (samples.files[flavor][m[1]] ??= []).push(Number(m[2]));
    m = /^\S+ {4}✓ npm-static pilots(?: \(sanitized\))? > (.*?) {2}(\d+)ms$/.exec(line);
    if (m) (samples.npmStatic[flavor][m[1]] ??= []).push(Number(m[2]));
  }
}
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
let updated = 0;
for (const [name, table] of Object.entries(tables))
  for (const flavor of ["plain", "san"]) {
    for (const [key, values] of Object.entries(samples[name][flavor])) {
      table[flavor][key] = median(values);
      updated++;
    }
    table[flavor] = Object.fromEntries(
      Object.entries(table[flavor])
        .filter(([key]) => name !== "files" || !skipped.has(key))
        .sort(([a], [b]) => a.localeCompare(b)),
    );
  }
writeFileSync(filePath, JSON.stringify(tables.files, null, 2) + "\n");
writeFileSync(npmStaticPath, JSON.stringify(tables.npmStatic, null, 2) + "\n");
console.log(`updated ${updated} costs`);
