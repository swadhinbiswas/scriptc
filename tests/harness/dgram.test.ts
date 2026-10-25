/* The dgram/dns differential — the server.test.ts harness verbatim over
 * tests/fixtures/dgram: fixtures run under Node AND compiled, three legs
 * compared byte-exactly (the fixture's stdout, its exit code, and the
 * per-case driver's stdout when one exists). Most cases are driver-less
 * SELF-CONTAINED loopback conversations (two sockets in one process —
 * bind 127.0.0.1:0, ephemeral ports never printed); udp-driver-echo
 * follows the PORT protocol with a real cross-process peer. dns-lookup
 * resolves only 'localhost' (hosts file) and a reserved .invalid name —
 * both lanes call the same getaddrinfo on the same machine, so no
 * external DNS dependency. SCRIPTC_SAN=1 rebuilds with ASan + the RC audit:
 * dgram handle hygiene runs over every case. */
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, globSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { compile } from "@scriptc/compiler";

const repoRoot = join(import.meta.dirname, "../..");
const fixturesRoot = join(repoRoot, "tests/fixtures/dgram");
const cacheDir = join(repoRoot, "node_modules/.cache/scriptc-tests");
const sanitize = process.env["SCRIPTC_SAN"] === "1";

interface ProgramRun {
  stdout: Buffer;
  exitCode: number;
  /** The driver's stdout, "" for driver-less cases. */
  driverStdout: string;
}

/** Runs one lane: spawn the fixture, follow the PORT protocol when the
 * case has a driver, and collect all three compared legs. */
function runLane(cmd: string, args: string[], driver: string | null): Promise<ProgramRun> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    const out: Buffer[] = [];
    let errText = "";
    let driverStarted = false;
    let driverStdout = "";
    let driverDone: Promise<void> = Promise.resolve();
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`dgram program timed out\nstderr so far:\n${errText}`));
    }, 60_000);
    child.stdout.on("data", (c: Buffer) => out.push(c));
    child.stderr.on("data", (c: Buffer) => {
      errText += c.toString("utf8");
      if (driver !== null && !driverStarted) {
        const m = /^PORT (\d+)$/m.exec(errText);
        if (m) {
          driverStarted = true;
          driverDone = new Promise<void>((res, rej) => {
            const d = spawn("node", [driver, m[1]!], { stdio: ["ignore", "pipe", "inherit"] });
            d.stdout.on("data", (c: Buffer) => (driverStdout += c.toString("utf8")));
            d.on("close", (code) => {
              if (code === 0) res();
              else rej(new Error(`driver exited ${code}`));
            });
          });
        }
      }
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      if (signal) {
        reject(new Error(`dgram program died to ${signal}\nstderr:\n${errText}`));
        return;
      }
      if (driver !== null && !driverStarted) {
        reject(new Error(`dgram program exited without a PORT line\nstderr:\n${errText}`));
        return;
      }
      driverDone.then(
        () => resolve({ stdout: Buffer.concat(out), exitCode: code ?? 0, driverStdout }),
        reject,
      );
    });
  });
}

async function build(entry: string): Promise<string> {
  const hash = createHash("sha256");
  hash.update(entry).update(readFileSync(entry));
  const key = hash
    .update(sanitize ? "san" : "plain")
    .digest("hex")
    .slice(0, 16);
  const outDir = join(cacheDir, `dgram-${key}`);
  mkdirSync(outDir, { recursive: true });
  const result = await compile(entry, {
    outPath: join(outDir, "program"),
    outDir,
    sanitize,
    // Pinned: a networking suite whose flake surface is already the
    // sockets — the compiled lane stays the C reference so any diff is
    // network behavior, never a backend-lane change.
    backend: "llvm",
  });
  if (!result.ok) {
    throw new Error(
      "dgram fixture failed to compile:\n" +
        result.diagnostics.map((d) => `${d.code}: ${d.message}`).join("\n"),
    );
  }
  return result.binaryPath;
}

const cases = globSync(join(fixturesRoot, "cases/*/main.ts"))
  .sort()
  .map((entry) => ({
    name: entry.split("/").at(-2)!,
    entry,
    driver: existsSync(join(entry, "../driver.mjs")) ? join(entry, "../driver.mjs") : null,
  }));

describe(`dgram differential (${cases.length} programs${sanitize ? ", sanitized" : ""})`, () => {
  test.for(cases.map((c) => [c.name, c] as const))(
    "%s",
    async ([, c]) => {
      const binary = await build(c.entry);
      // Sequential, not parallel: both lanes bind ephemeral ports and drive
      // real sockets — parallelism buys little and interleaves kernel state.
      const nodeRes = await runLane("node", [c.entry], c.driver);
      const nativeRes = await runLane(binary, [], c.driver);
      expect(nativeRes.stdout.toString("utf8")).toBe(nodeRes.stdout.toString("utf8"));
      if (!nodeRes.stdout.equals(nativeRes.stdout)) {
        expect.unreachable("stdout differed at byte level but not after utf8 decode");
      }
      expect(nativeRes.exitCode).toBe(nodeRes.exitCode);
      expect(nativeRes.driverStdout).toBe(nodeRes.driverStdout);
    },
    120_000,
  );
});
