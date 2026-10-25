/* Advisory single-flight lock for FULL suite runs (`vitest run` with no file
 * filters and no -t). Concurrent full suites — typically parallel agents —
 * oversubscribe the CPU and produce a known flake class (vitest worker RPC
 * timeouts, event-loop timing failures), so later runs queue behind the first
 * with a visible waiting message instead of thrashing.
 *
 * Deliberately simple and advisory: a pidfile in the OS temp dir, no daemon.
 * Stale locks (dead pid, unreadable record) are stolen; a waiter gives up
 * after 45 minutes and proceeds anyway. Filtered/watch runs never wait.
 * Opt out entirely with SCRIPTC_NO_LOCK=1. */
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/* The lock is PER FLAVOR: the plain and sanitized lanes read the same
 * committed tree through separate binary/oracle cache directories, so one
 * of each may run concurrently by design (the merge-gate pattern splits
 * workers between them via SCRIPTC_TEST_WORKERS). The lock's job is only
 * to stop two runs of the SAME flavor from thrashing each other's caches
 * and the CPU accidentally. */
const FLAVOR = process.env.SCRIPTC_SAN === "1" ? "san" : "plain";
const LOCK_PATH = join(tmpdir(), `scriptc-full-suite-${FLAVOR}.lock`);
const MAX_WAIT_MS = 45 * 60 * 1000;
const POLL_MS = 2000;

// Flags whose VALUE arrives as a separate argv token — those values must not
// count as file filters. Misclassification only ever skips the lock (fails
// open to today's behavior), never blocks a filtered run.
const VALUE_FLAGS = new Set([
  "-t",
  "--testNamePattern",
  "--reporter",
  "--outputFile",
  "--config",
  "--root",
  "--dir",
  "--project",
  "--pool",
  "--maxWorkers",
  "--minWorkers",
  "--exclude",
  "--shard",
  "--retry",
  "--bail",
  "--testTimeout",
  "--hookTimeout",
  "--environment",
  "--outputFile.json",
]);

function isFullSuiteRun() {
  const argv = process.argv.slice(2);
  if (argv[0] !== "run") return false; // watch/list/bench sessions never hold the lock
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-t" || a.startsWith("--testNamePattern")) return false;
    if (a.startsWith("-")) {
      if (VALUE_FLAGS.has(a)) i++; // skip the flag's value token
      continue;
    }
    return false; // a positional file filter
  }
  return true;
}

function holderPid() {
  try {
    const rec = JSON.parse(readFileSync(LOCK_PATH, "utf8"));
    return typeof rec.pid === "number" ? rec.pid : null;
  } catch {
    return null;
  }
}

function pidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default async function setup() {
  if (process.env.SCRIPTC_NO_LOCK === "1" || !isFullSuiteRun()) return () => {};

  const started = Date.now();
  let waitingSince = 0;
  let acquired = false;
  while (Date.now() - started < MAX_WAIT_MS) {
    try {
      writeFileSync(
        LOCK_PATH,
        JSON.stringify({
          pid: process.pid,
          startedAt: new Date().toISOString(),
          cwd: process.cwd(),
        }),
        { flag: "wx" },
      );
      acquired = true;
      break;
    } catch {
      const pid = holderPid();
      if (pid === null || !pidAlive(pid)) {
        try {
          rmSync(LOCK_PATH, { force: true });
        } catch {
          /* racing steal — retry */
        }
        continue;
      }
      if (Date.now() - waitingSince > 30_000) {
        console.log(
          `[scriptc] full-suite lock held by pid ${pid} (${LOCK_PATH}) — waiting; SCRIPTC_NO_LOCK=1 skips`,
        );
        waitingSince = Date.now();
      }
      await sleep(POLL_MS);
    }
  }
  if (!acquired)
    console.warn("[scriptc] full-suite lock wait exceeded 45 minutes — proceeding without it");

  return () => {
    if (!acquired) return;
    try {
      if (holderPid() === process.pid) rmSync(LOCK_PATH, { force: true });
    } catch {
      /* best-effort release; a dead-pid steal cleans up otherwise */
    }
  };
}
