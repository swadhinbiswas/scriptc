/* Acceptance artifact for the build/oracle caches: runs the FULL suite three
 * times — uncached (SCRIPTC_NO_CACHE=1), cache-populating (cold cache), cached
 * (warm hits) — and diffs the vitest results (every test's file, full name,
 * status, and failure messages) between the cached and uncached passes.
 * Identical output is the gate for trusting the cache; any drift exits 1
 * with the differing lines.
 *
 * Usage: node tests/harness/cache-identity.mjs [--san] [--keep-llvmache]
 *   --san         run the sanitized lane (SCRIPTC_SAN=1)
 *   --keep-llvmache  don't wipe the cache before the populate pass
 * Prints a timing table (uncached / populate / cached) as a side effect. */
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(fileURLToPath(import.meta.url), "../../..");
const san = process.argv.includes("--san");
const keepLlvmache = process.argv.includes("--keep-llvmache");
// Must match vitest.config.ts's default.
const cacheDir =
  process.env.SCRIPTC_CACHE_DIR ?? join(repoRoot, "node_modules/.cache/scriptc-tests/cas");
const outDir = mkdtempSync(join(tmpdir(), "scr-cache-identity-"));

function runSuite(label, extraEnv) {
  const outputFile = join(outDir, `${label}.json`);
  const env = { ...process.env, ...(san ? { SCRIPTC_SAN: "1" } : {}) };
  delete env.SCRIPTC_NO_CACHE; // the caller's escape hatch must not leak into cached passes
  Object.assign(env, extraEnv);
  console.log(`\n=== ${label} pass (${san ? "SCRIPTC_SAN=1 lane" : "plain lane"}) ===`);
  const t0 = Date.now();
  const res = spawnSync(
    "pnpm",
    [
      "exec",
      "vitest",
      "run",
      "--reporter=dot",
      "--reporter=json",
      `--outputFile.json=${outputFile}`,
    ],
    { cwd: repoRoot, env, stdio: ["ignore", "inherit", "inherit"] },
  );
  const seconds = (Date.now() - t0) / 1000;
  if (res.error) throw res.error;
  const json = JSON.parse(readFileSync(outputFile, "utf8"));
  return { label, seconds, json, exit: res.status ?? -1 };
}

/** One line per test: file :: full name :: status [:: failure messages]. */
function resultLines(json) {
  const lines = [];
  for (const fileResult of json.testResults ?? []) {
    const file = relative(repoRoot, fileResult.name);
    for (const t of fileResult.assertionResults ?? []) {
      const failures = (t.failureMessages ?? []).join(" | ").replaceAll("\n", "\\n");
      lines.push(`${file} :: ${t.fullName} :: ${t.status}${failures ? ` :: ${failures}` : ""}`);
    }
  }
  return lines.sort();
}

function counts(json) {
  return `${json.numTotalTests} tests, ${json.numPassedTests} passed, ${json.numFailedTests} failed, ${json.numPendingTests} skipped`;
}

if (!keepLlvmache) {
  console.log(`wiping cache at ${cacheDir}`);
  rmSync(cacheDir, { recursive: true, force: true });
}

const uncached = runSuite("uncached", { SCRIPTC_NO_CACHE: "1" });
const populate = runSuite("populate", {});
const cached = runSuite("cached", {});

console.log(`\n=== timing (${san ? "SCRIPTC_SAN=1 lane" : "plain lane"}) ===`);
for (const pass of [uncached, populate, cached]) {
  console.log(
    `${pass.label.padEnd(9)} ${pass.seconds.toFixed(1).padStart(8)}s   ${counts(pass.json)}`,
  );
}

const a = resultLines(uncached.json);
const b = resultLines(cached.json);
const aSet = new Set(a);
const bSet = new Set(b);
const onlyUncached = a.filter((l) => !bSet.has(l));
const onlyCached = b.filter((l) => !aSet.has(l));

console.log(`\n=== identity: cached vs uncached ===`);
if (onlyUncached.length === 0 && onlyCached.length === 0) {
  console.log(
    `IDENTICAL: ${a.length} test results match exactly (names, statuses, failure output)`,
  );
  process.exit(0);
}
console.log(`DIFFER: ${onlyUncached.length} only-in-uncached, ${onlyCached.length} only-in-cached`);
for (const l of onlyUncached) console.log(`  -uncached  ${l}`);
for (const l of onlyCached) console.log(`  +cached    ${l}`);
process.exit(1);
