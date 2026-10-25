import { execFile } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { expect, test } from "vitest";
import { compile } from "@scriptc/compiler";

const execFileAsync = promisify(execFile);
const repoRoot = join(import.meta.dirname, "../..");
const entry = join(repoRoot, "tests/fixtures/workspace-source/main.ts");
const cacheDir = join(repoRoot, "node_modules/.cache/scriptc-tests/workspace-source");
const sanitize = process.env["SCRIPTC_SAN"] === "1";

test.for(["llvm"] as const)(
  "a TypeScript-source workspace package compiles as program modules with the %s backend",
  async (backend) => {
    const outDir = join(cacheDir, `${backend}-${sanitize ? "san" : "plain"}`);
    mkdirSync(outDir, { recursive: true });
    const result = await compile(entry, {
      outPath: join(outDir, "program"),
      outDir,
      backend,
      sanitize,
    });
    if (!result.ok) {
      throw new Error(
        result.diagnostics
          .map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`)
          .join("\n"),
      );
    }

    const { stdout } = await execFileAsync(result.binaryPath, [], { encoding: "utf8" });
    expect(stdout).toBe("wssource:linked:6\n");
  },
  120_000,
);
