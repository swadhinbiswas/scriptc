import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import { analyze, compile, serializeModule } from "@scriptc/compiler";
import { integerRangeCases } from "./self-hosting-range-cases.js";

const root = fileURLToPath(new URL("../..", import.meta.url));
const entry = join(root, "tests/fixtures/self-hosting/integer-ranges.ts");
const options = { cwd: root, timeout: 30_000, maxBuffer: 16 * 1024 * 1024 };
interface Row {
  kind: string;
  start: number;
  present: boolean;
  min: number | null;
  max: number | null;
}
interface Result {
  name: string;
  ranges: Row[];
}

test("production integer-range analysis lowers statically with identity-keyed maps", () => {
  const { coverage } = analyze(entry, {});
  expect(coverage.preflightFailed).toBe(false);
  expect(coverage.diagnostics).toEqual([]);
  expect(coverage.stats.statementsTotal).toBeGreaterThan(250);
  expect(coverage.stats.statementsFailed).toBe(0);
  expect(coverage.stats.functionsSkipped).toBe(0);
});

for (const backend of ["llvm"] as const) {
  test(`native integer-range analysis preserves proofs and expression identity (${backend})`, async () => {
    const dir = mkdtempSync(
      join(process.platform === "win32" ? tmpdir() : "/tmp", "scriptc-native-ranges-"),
    );
    try {
      const built = await compile(entry, {
        outDir: dir,
        outPath: join(dir, process.platform === "win32" ? "stage.exe" : "stage"),
        backend,
        optimization: "dev",
        sanitize: process.env["SCRIPTC_SAN"] === "1",
      });
      if (!built.ok)
        throw new Error(built.diagnostics.map((d) => `${d.code}: ${d.message}`).join("\n"));
      expect(built.backend).toBe(backend);
      const run = (argument: string, name: string): string => {
        const oracle = spawnSync(process.execPath, ["--import", "tsx", entry, argument], options);
        const native = spawnSync(built.binaryPath, [argument], options);
        for (const result of [oracle, native]) {
          expect(result.error, name).toBeUndefined();
          expect(result.signal, `${name}: ${result.stderr}`).toBeNull();
          expect(result.status, `${name}: ${result.stderr}`).toBe(0);
          expect(result.stderr.toString(), name).toBe("");
        }
        expect(native.stdout, name).toEqual(oracle.stdout);
        return native.stdout.toString();
      };
      for (const item of integerRangeCases()) {
        const input = join(dir, "input.json");
        writeFileSync(input, serializeModule(item.module));
        const output = JSON.parse(run(input, item.name)) as Result[];
        for (const expected of item.expected) {
          const row = output[0]!.ranges.find((row) => row.start === expected.start);
          expect(row, item.name).toMatchObject(expected);
        }
      }
      const shared = run("shared", "shared expression identity")
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line) as Row[]);
      expect(
        shared[0]!.filter((row) => row.kind === "varRef").map((row) => [row.min, row.max]),
      ).toEqual([
        [1, 8],
        [1, 8],
      ]);
      expect(shared[1]!.filter((row) => row.kind === "varRef").map((row) => row.min)).toEqual([
        null,
        null,
        null,
      ]);
      expect(shared[2]!.filter((row) => row.kind === "varRef").map((row) => row.min)).toEqual([
        2, 9,
      ]);
      expect(shared[3]).toEqual([
        { kind: "numLit", start: 0, present: true, min: null, max: null },
      ]);

      // Real frontend IR exercises the exact representation the two emitters
      // supply to analyzeIntegerRanges, including lowered helper functions.
      for (const source of [
        "1409-typedarray-integer-loops.ts",
        "3103-scalar-record-nested-control-flow.ts",
        "3109-identity-union-collections.ts",
        "byte-number-pipeline.ts",
        "module-byte-loops.ts",
      ]) {
        const path = join(dir, "frontend.json");
        const result = await compile(join(root, "tests/corpus", source), {
          outDir: dir,
          outPath: path,
          outputKind: "ir",
        });
        if (!result.ok) throw new Error(result.diagnostics.map((d) => d.message).join("\n"));
        expect(readFileSync(path, "utf8").length).toBeGreaterThan(0);
        const output = JSON.parse(run(path, source)) as Result[];
        expect(
          output.some((fn) => fn.ranges.some((row) => row.present)),
          source,
        ).toBe(true);
        expect(
          output.some((fn) => fn.ranges.some((row) => row.min !== null)),
          source,
        ).toBe(true);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}
