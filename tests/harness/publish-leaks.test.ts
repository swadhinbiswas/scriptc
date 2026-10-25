/* Published objects (@scriptc/threads publish() and the zero-copy delivery
 * of deeply frozen plain-data graphs) are immortal by design: nothing frees
 * them, and the RC audit stops counting them. LeakSanitizer must agree, so
 * the runtime marks every published object as an intentional leak-scan
 * root. The sanitized lanes otherwise run with detect_leaks=0, so this pins
 * the contract with LeakSanitizer explicitly on: programs that drop their
 * last reference to a published graph exit cleanly. Linux only (Apple's
 * ASan has no LeakSanitizer); runs in the SCRIPTC_SAN=1 lane. */
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, test } from "vitest";
import { compile } from "@scriptc/compiler";

const execFileAsync = promisify(execFile);
const repoRoot = join(import.meta.dirname, "../..");
const cacheDir = join(repoRoot, "node_modules/.cache/scriptc-tests");
const sanitize = process.env["SCRIPTC_SAN"] === "1";

const programs = [
  "tests/fixtures/publish-leaks/dropped.ts",
  // Zero-copy delivery of deeply frozen plain-data graphs (scr_message.c).
  "tests/corpus/native-worker-published-graphs.ts",
  // Typed graphs published on both threads, including a refused publish.
  "tests/corpus/native-worker-publish-classes.ts",
];

describe.skipIf(!sanitize || process.platform !== "linux")(
  "published objects under LeakSanitizer",
  () => {
    test.each(programs)("%s reports no leaks", { timeout: 300_000 }, async (program) => {
      const file = join(repoRoot, program);
      const key = createHash("sha256")
        .update(file)
        .update(readFileSync(file))
        .update("san")
        .digest("hex")
        .slice(0, 16);
      const outDir = join(cacheDir, `publish-leaks-${key}`);
      mkdirSync(outDir, { recursive: true });
      const result = await compile(file, {
        outPath: join(outDir, "program"),
        outDir,
        sanitize: true,
        backend: "llvm",
      });
      if (!result.ok) {
        throw new Error(
          "program failed to compile:\n" +
            result.diagnostics.map((d) => `${d.code}: ${d.message}`).join("\n"),
        );
      }
      const run = await execFileAsync(result.binaryPath, [], {
        env: { ...process.env, ASAN_OPTIONS: "detect_leaks=1" },
        maxBuffer: 16 * 1024 * 1024,
      }).catch((error: { code?: number; stdout?: string; stderr?: string }) => error);
      expect(run.stderr).toBe("");
      expect("code" in run ? run.code : 0).toBe(0);
      const expected = await execFileAsync(process.execPath, [file], {
        env: { ...process.env, SCRIPTC_TEST_ENV: "from-harness" },
        maxBuffer: 16 * 1024 * 1024,
      });
      expect(run.stdout).toBe(expected.stdout);
    });
  },
);
