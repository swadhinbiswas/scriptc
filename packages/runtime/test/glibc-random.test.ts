import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";

const report =
  process.platform === "linux"
    ? (process.report.getReport() as { header: { glibcVersionRuntime?: string } })
    : undefined;
const version = report?.header.glibcVersionRuntime?.split(".").map(Number);
// The probe targets glibc 2.34 exactly, which only zig cc can select.
const hasZig = spawnSync("zig", ["version"], { stdio: "ignore" }).status === 0;
const supported =
  hasZig &&
  version !== undefined &&
  (version[0]! > 2 || (version[0] === 2 && version[1]! >= 34)) &&
  (process.arch === "x64" || process.arch === "arm64");
test.skipIf(!supported)(
  "glibc 2.34 CSPRNG retries interruptions and partial reads and traps on entropy failure",
  () => {
    const directory = mkdtempSync("/tmp/scriptc-glibc-random-");
    const binary = join(directory, "random");
    try {
      execFileSync(
        "zig",
        [
          "cc",
          "-target",
          `${process.arch === "x64" ? "x86_64" : "aarch64"}-linux-gnu.2.34`,
          "-std=c11",
          "-O2",
          "-D_GNU_SOURCE",
          "-I",
          join(import.meta.dirname, "../src"),
          join(import.meta.dirname, "test_glibc_random.c"),
          "-o",
          binary,
        ],
        { timeout: 120_000 },
      );
      expect(execFileSync(binary, [], { encoding: "utf8" })).toBe(
        "entropy retries and failures verified\n",
      );
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  },
  120_000,
);
