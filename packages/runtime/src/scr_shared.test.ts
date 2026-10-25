import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { expect, test } from "vitest";
import { EXECUTABLE_RUNTIME_SOURCES } from "../../compiler/src/backend/native-toolchain.js";

const exec = promisify(execFile);

// Atomics operations take no lock, and every other access to shared bytes
// is a relaxed atomic one; the ThreadSanitizer build checks that concurrent
// element, bulk and Atomics accesses to the same bytes are race-free.
test
  .skipIf(process.platform === "win32")
  .each([["-fsanitize=address,undefined"], ["-fsanitize=thread"]])(
  "shared views keep concurrent accesses atomic and cancel parked waiters (%s)",
  async (sanitize) => {
    const dir = await mkdtemp(join(tmpdir(), "scriptc-shared-"));
    try {
      const bin = join(dir, "shared");
      await exec("clang", [
        "-std=c11",
        "-O1",
        "-pthread",
        "-DSCR_WORKERS",
        "-DSCR_RC_AUDIT",
        sanitize,
        "-Wno-deprecated-declarations",
        ...(process.platform === "linux" ? ["-D_GNU_SOURCE"] : []),
        ...["scr_shared.test.c", ...EXECUTABLE_RUNTIME_SOURCES].map((name) =>
          join(import.meta.dirname, name),
        ),
        ...(process.platform === "linux" ? ["-lm"] : []),
        "-o",
        bin,
      ]);
      const result = await exec(bin, [], {
        timeout: 30000,
        env: { ...process.env, UBSAN_OPTIONS: "halt_on_error=1", TSAN_OPTIONS: "halt_on_error=1" },
      });
      expect(result.stdout).toBe(
        "shared views preserve atomic updates, wait queues and cancellation ownership\n",
      );
      expect(result.stderr).toBe("");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  },
);
