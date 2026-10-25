import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { expect, test } from "vitest";

const exec = promisify(execFile);

/* The table unit links alone (the test supplies scr_trap), so the stress
 * test runs under ThreadSanitizer as well as AddressSanitizer. */
const lanes = [
  { name: "address", flags: ["-fsanitize=address,undefined"], run: process.platform !== "win32" },
  { name: "thread", flags: ["-fsanitize=thread"], run: process.platform === "linux" },
];

for (const lane of lanes)
  test.skipIf(!lane.run)(
    `intern tables keep one entry per key across racing inserts and lookups (${lane.name})`,
    async () => {
      const dir = await mkdtemp(join(tmpdir(), "scriptc-itable-"));
      try {
        const bin = join(dir, "itable");
        await exec("clang", [
          "-std=c11",
          "-O1",
          "-g",
          "-pthread",
          "-DSCR_WORKERS",
          ...lane.flags,
          ...(process.platform === "linux" ? ["-D_GNU_SOURCE"] : []),
          join(import.meta.dirname, "scr_itable.test.c"),
          join(import.meta.dirname, "scr_itable.c"),
          "-o",
          bin,
        ]);
        const result = await exec(bin, [], {
          timeout: 60000,
          env: {
            ...process.env,
            UBSAN_OPTIONS: "halt_on_error=1",
            TSAN_OPTIONS: "halt_on_error=1",
          },
        });
        expect(result.stdout).toBe(
          "intern tables share one entry per key across racing inserts and lookups\n",
        );
        expect(result.stderr).toBe("");
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  );
