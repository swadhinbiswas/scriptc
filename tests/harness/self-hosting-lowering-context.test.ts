import { execFile, execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import type { AnalyzeResult, compile } from "@scriptc/compiler";
import { expect, test } from "vitest";
import { ts7Executable } from "../../packages/compiler/src/frontend/ts7/rpc-api.js";

const root = join(import.meta.dirname, "../..");
const entry = join(root, "tests/fixtures/self-hosting/lowering-context.ts");
const oracle = join(root, "tests/fixtures/self-hosting/lowering-context-node.ts");
const nativeSources = join(root, "packages/compiler/native");
const sanitize = process.env["SCRIPTC_SAN"] === "1";
const execFileAsync = promisify(execFile);

for (const backend of ["llvm"] as const) {
  test(`production lexical contexts run with native TS7 symbols (${backend})`, async () => {
    const directory = mkdtempSync(
      join(process.platform === "win32" ? tmpdir() : "/tmp", "scriptc-lowering-context-"),
    );
    try {
      const object = join(directory, "process.o");
      execFileSync("clang", [
        "-std=c11",
        "-Wall",
        "-Wextra",
        "-Werror",
        ...(sanitize ? ["-fsanitize=address"] : []),
        "-c",
        join(nativeSources, "ts7-process.c"),
        "-o",
        object,
      ]);
      const profile = join(directory, "ffi.json");
      writeFileSync(
        profile,
        JSON.stringify({
          ...JSON.parse(readFileSync(join(nativeSources, "ts7-process.ffi.json"), "utf8")),
          libraries: [object],
        }),
      );
      const source = join(directory, "input.ts");
      writeFileSync(
        source,
        `
        export const value = 1;
        export function shadow(): number { const value = 2; return value; }
        export const unused = 3;
      `,
      );
      const expected = join(directory, "node.json");
      const node = spawnSync(
        process.execPath,
        ["--import", "tsx", oracle, ts7Executable(), source, expected],
        {
          encoding: "utf8",
          timeout: 90_000,
        },
      );
      expect(node.error, node.stderr).toBeUndefined();
      expect(node.status, node.stderr).toBe(0);
      expect(node.stdout).toBe("");
      expect(node.stderr).toBe("");
      const nodeReport = JSON.parse(readFileSync(expected, "utf8")) as {
        first: string[];
        second: string[];
      };
      expect(nodeReport.first).toHaveLength(16);
      expect(nodeReport.second).toEqual(nodeReport.first);

      // Synchronous frontend work can outlast Vitest's worker-RPC deadline
      // under contention. Await the same source API in a child process.
      const api = pathToFileURL(join(root, "packages/compiler/src/index.ts")).href;
      const { stdout, stderr } = await execFileAsync(
        process.execPath,
        [
          "--import",
          "tsx",
          "--input-type=module",
          "--eval",
          `import { analyze, compile } from ${JSON.stringify(api)};
         const options = { ffiProfilePath: process.argv[2] };
         const { coverage } = analyze(process.argv[1], options);
         const built = await compile(process.argv[1], {
           ...options, backend: process.argv[3], optimization: 'dev', sanitize: process.argv[4] === '1',
           outDir: process.argv[5], outPath: process.argv[6],
         });
         console.log(JSON.stringify({ coverage: {
           preflightFailed: coverage.preflightFailed, diagnostics: coverage.diagnostics, stats: coverage.stats,
         }, built }));`,
          entry,
          profile,
          backend,
          sanitize ? "1" : "0",
          directory,
          join(directory, process.platform === "win32" ? "contexts.exe" : "contexts"),
        ],
        { cwd: root, timeout: 300_000, maxBuffer: 32 * 1024 * 1024 },
      );
      expect(stderr).toBe("");
      const { coverage, built } = JSON.parse(stdout) as {
        coverage: AnalyzeResult["coverage"];
        built: Awaited<ReturnType<typeof compile>>;
      };
      expect(coverage.preflightFailed, JSON.stringify(coverage.diagnostics)).toBe(false);
      expect(coverage.stats.statementsFailed, JSON.stringify(coverage.diagnostics)).toBe(0);
      expect(coverage.stats.functionsSkipped).toBe(0);
      if (!built.ok)
        throw new Error(built.diagnostics.map((d) => `${d.code}: ${d.message}`).join("\n"));
      expect(built.backend).toBe(backend);

      const output = join(directory, "native.json");
      const run = spawnSync(built.binaryPath, [ts7Executable(), source, output], {
        encoding: "utf8",
        timeout: 90_000,
      });
      expect(run.error, run.stderr).toBeUndefined();
      expect(run.signal, run.stderr).toBeNull();
      expect(run.status, run.stderr).toBe(0);
      expect(run.stdout).toBe(node.stdout);
      expect(run.stderr).toBe(node.stderr);
      expect(JSON.parse(readFileSync(output, "utf8"))).toEqual(nodeReport);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
}
