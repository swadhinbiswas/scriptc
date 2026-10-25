import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { compile } from "@scriptc/compiler";

const fixture = join(import.meta.dirname, "../ffi/memory.mjs");
const sanitize = process.env["SCRIPTC_SAN"] === "1";
const oracle = process.env["SCRIPTC_NODE_FFI_ORACLE"];
const expected =
  "bigint true\n10,99,30,40 99,30\n10,99,30,40 55,99,30,40\ntrue\n231\n0\n" +
  "TypeError ERR_INVALID_ARG_VALUE The first argument must be a non-negative bigint\n".repeat(2) +
  "Error ERR_FFI_INVALID_POINTER Cannot create an ArrayBuffer from a null pointer\n" +
  "TypeError ERR_INVALID_ARG_VALUE The length must be a non-negative integer\n".repeat(2) +
  "TypeError ERR_INVALID_ARG_VALUE The pointer and length exceed the platform address range\n" +
  "RangeError ERR_OUT_OF_RANGE The length is too large\nError ERR_BUFFER_TOO_LARGE Buffer is too large\n" +
  "true\ntrue\ntrue\ntrue\nfalse\nfalse\n";

describe.each(["llvm"] as const)("native FFI memory, %s", (backend) => {
  test("aliases native memory and copies on request without an engine", async () => {
    const outDir = mkdtempSync(join(tmpdir(), "scriptc-ffi-memory-"));
    // Both loader spellings must keep real storage; bare `require` also
    // participates in the compiler's CommonJS alias recognition.
    for (const loader of ["require", "requireModule"]) {
      const entry = join(outDir, `${loader}.mjs`);
      writeFileSync(entry, readFileSync(fixture, "utf8").replaceAll("require", loader));
      const result = await compile(entry, {
        backend,
        sanitize,
        outDir,
        outPath: join(outDir, loader),
      });
      if (!result.ok)
        throw new Error(result.diagnostics.map((d) => `${d.code}: ${d.message}`).join("\n"));
      const native = spawnSync(result.binaryPath, [], { encoding: "utf8", timeout: 10_000 });
      expect(native.error).toBeUndefined();
      expect(native.stderr).toBe("");
      expect(native.status).toBe(0);
      expect(native.stdout).toBe(expected);
      // Node 24 remains the repository oracle; node:ffi first shipped in
      // Node 26.1. An explicit Node 26 path enables direct parity here.
      if (oracle) {
        const node = spawnSync(
          oracle,
          ["--disable-warning=ExperimentalWarning", "--experimental-ffi", entry],
          { encoding: "utf8" },
        );
        expect(node.error).toBeUndefined();
        expect(node.stderr).toBe(native.stderr);
        expect(node.status).toBe(native.status);
        expect(node.stdout).toBe(native.stdout);
      }
    }
  });
});
