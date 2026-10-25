import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import { compile, deserializeModule, validateModule } from "@scriptc/compiler";
import { validatorCases } from "./self-hosting-validator-cases.js";

const root = fileURLToPath(new URL("../..", import.meta.url));
const entry = join(root, "tests/fixtures/self-hosting/validate.ts");
const runOptions = { cwd: root, timeout: 30_000, maxBuffer: 16 * 1024 * 1024 };

for (const backend of ["llvm"] as const) {
  test(`self-hosting full validator: ${backend} matches Node on valid and invalid IR`, async () => {
    const dir = mkdtempSync(
      join(process.platform === "win32" ? tmpdir() : "/tmp", "scriptc-native-validator-"),
    );
    try {
      const built = await compile(entry, {
        outDir: dir,
        outPath: join(dir, process.platform === "win32" ? "validator.exe" : "validator"),
        backend,
        optimization: "dev",
        sanitize: process.env["SCRIPTC_SAN"] === "1",
      });
      if (!built.ok)
        throw new Error(built.diagnostics.map((d) => `${d.code}: ${d.message}`).join("\n"));
      expect(built.backend).toBe(backend);
      const check = (
        name: string,
        input: string,
        diagnostic?: string,
        serialized = false,
      ): void => {
        const path = join(dir, "input.json");
        writeFileSync(path, input);
        const expected = validateModule(serialized ? deserializeModule(input) : JSON.parse(input));
        if (diagnostic)
          expect(
            expected.some((d) => d.message.includes(diagnostic)),
            name,
          ).toBe(true);
        else expect(expected, name).toEqual([]);
        const args = [path, ...(serialized ? ["serialized"] : [])];
        const oracle = spawnSync(process.execPath, ["--import", "tsx", entry, ...args], runOptions);
        const native = spawnSync(built.binaryPath, args, runOptions);
        for (const result of [oracle, native]) {
          expect(result.error, name).toBeUndefined();
          expect(result.signal, `${name}: ${result.stderr}`).toBeNull();
          expect(result.status, `${name}: ${result.stderr}`).toBe(0);
        }
        expect(native.stdout, name).toEqual(oracle.stdout);
        expect(native.stderr, name).toEqual(oracle.stderr);
        expect(JSON.parse(native.stdout.toString()), name).toEqual(expected);
      };
      for (const item of validatorCases())
        check(item.name, JSON.stringify(item.module), item.diagnostic);

      // Exercise real emitted IR, including recursive type tables, lifted
      // closures, Error subclasses, dyn conversions and container helpers.
      for (const source of [
        "tests/corpus/3086-error-constructor-options.ts",
        "tests/corpus/3088-array-wide-callbacks.ts",
        "tests/corpus/3089-array-find-narrowing.ts",
        "tests/corpus/3091-json-recursive-discriminants.ts",
        "tests/corpus/3109-identity-union-collections.ts",
        "tests/corpus/collection-value-keys.ts",
        "tests/corpus/collection-storage-copies.ts",
        "tests/corpus/byte-number-pipeline.ts",
        "tests/corpus/nullish-long-chain.ts",
      ]) {
        const irPath = join(dir, "emitted.json");
        const emitted = await compile(join(root, source), {
          outDir: dir,
          outPath: irPath,
          outputKind: "ir",
        });
        if (!emitted.ok)
          throw new Error(emitted.diagnostics.map((d) => `${d.code}: ${d.message}`).join("\n"));
        check(source, readFileSync(irPath, "utf8"), undefined, true);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}
