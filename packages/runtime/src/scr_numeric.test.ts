import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { expect, test } from "vitest";

const exec = promisify(execFile);

test("integer coercion matches modular truncation across binary64 encodings", async () => {
  const scratch = await mkdtemp(join(tmpdir(), "scriptc-numeric-"));
  try {
    const binary = join(scratch, "numeric");
    await exec("clang", [
      "-std=c11",
      "-O2",
      "-Wall",
      "-Wextra",
      "-fsanitize=address,undefined",
      join(import.meta.dirname, "scr_numeric.test.c"),
      "-o",
      binary,
      ...(process.platform === "linux" ? ["-lm"] : []),
    ]);
    const result = await exec(binary, [], {
      env: { ...process.env, UBSAN_OPTIONS: "halt_on_error=1" },
    });
    expect(result.stdout).toBe("numeric coercions passed\n");
    expect(result.stderr).toBe("");
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
});
