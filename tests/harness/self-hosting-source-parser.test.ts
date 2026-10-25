import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { analyzeInChild, compileInChild } from "./self-hosting-compiler-process.js";
import { expect, test } from "vitest";
import { ts7Executable } from "../../packages/compiler/src/frontend/ts7/rpc-api.js";

const root = join(import.meta.dirname, "../..");
const entry = join(root, "tests/fixtures/self-hosting/ts7-source-parser.ts");
const oracle = join(root, "tests/fixtures/self-hosting/ts7-source-parser-node.ts");
const nativeSources = join(root, "packages/compiler/native");
const tempRoot = process.platform === "win32" ? tmpdir() : "/tmp";
const sanitize = process.env["SCRIPTC_SAN"] === "1";
const execFileAsync = promisify(execFile);

function input() {
  const fixtures = join(root, "tests/fixtures/npm-static/node_modules");
  const packages = ["chainy", "virtual-classes", "bundled-methods"].map((name) => ({
    declarations: readFileSync(join(fixtures, name, "index.d.ts"), "utf8"),
    source: readFileSync(
      join(fixtures, name, name === "bundled-methods" ? "chunk.js" : "index.js"),
      "utf8",
    ),
  }));
  packages.push(
    {
      declarations:
        "export class Parser {} export class Input { parser: Parser | null; onData: (() => void) | null; }",
      source: `import { Parser } from "./parser.js";
export class Input {
  parser = null;
  onData = null;
  constructor() { this.parser = new Parser(); }
  reset() { this.parser = null; }
}
export class Child extends Input { onData = () => { console.log("called"); }; }`,
    },
    {
      declarations: "export class Item { name(): string; }",
      source: `export class Item { name() { return "item"; } }
export class List {
  constructor() { this.values = []; }
  /** @returns {Item} */
  find() { return this.values.find((item) => item.name() === "item"); }
  /** @returns {OldItem} */
  /** @type {() => Item} */
  callable() { return this.values.find((item) => true); }
  /** @type {{ (): Item }} */
  signature() { return this.values.find((item) => true); }
}`,
    },
    {
      declarations:
        "export class Box { value(): string; value(next: Date): this; optional?: Box | null; }",
      source:
        "export class Box { parser = null; value(next) { return next; } reset(value) { this.parser = value; } }",
    },
    {
      declarations:
        'export { Chainy } from "./chainy.js"; export * from "./other.js"; export * from "untrusted";',
      source: 'export { Renamed as Chainy } from "./implementation.js";',
    },
  );
  return {
    packages,
    files: [
      { path: "input.ts", text: "", kind: "ts" },
      { path: "input.ts", text: "\ufeffexport const 工作 = '😀';\r\n", kind: "ts" },
      { path: "input.ts", text: "export const revised = 2;", kind: "ts" },
      {
        path: "types.d.ts",
        text: "export class A { optional?: A; definite!: number; method?(): void; }",
        kind: "ts",
      },
      { path: "view.tsx", text: "export default <><main>text</main></>;", kind: "tsx" },
      { path: "broken.ts", text: "export const incomplete = ; function f( {", kind: "ts" },
      {
        path: "module.js",
        text: `#!/usr/bin/env node
export * as namespace from "namespace";
import { __require } from "./helper.js";
export { __require } from "./helper-again.js";
require("direct"); __require("shared");
import("later"); import(\`template\`); import(variable);
import.meta.resolve("resolve-only");
require("mixed"); import("mixed"); export { value } from "mixed";
// require("comment")
const text = 'require("string")'; const regex = /require("regex")/;
function nested() { return require("nested"); }`,
        kind: "js",
      },
      {
        path: "typed.ts",
        text: `import type { Type } from "type-only";
export type { Shape } from "shape-only";
import { type Inline, value } from "mixed-types";
export { value } from "runtime";
import("dynamic", { with: { type: "json" } });
require("cjs");`,
        kind: "ts",
      },
      {
        path: "deep.js",
        text: "const deep = " + "value + ".repeat(1800) + 'require("deep");',
        kind: "js",
      },
    ],
  };
}

for (const backend of ["llvm"] as const) {
  test(`source parsing, import scanning and declaration projection run without Node (${backend})`, async () => {
    const directory = mkdtempSync(join(tempRoot, "scriptc-source-parser-native-"));
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
      const coverage = await analyzeInChild(entry, { ffiProfilePath: profile });
      expect(coverage.preflightFailed, JSON.stringify(coverage.diagnostics)).toBe(false);
      expect(coverage.diagnostics).toEqual([]);
      expect(coverage.stats.statementsFailed).toBe(0);
      expect(coverage.stats.functionsSkipped).toBe(0);
      const built = await compileInChild(entry, {
        backend,
        optimization: "dev",
        sanitize,
        ffiProfilePath: profile,
        outDir: directory,
        outPath: join(directory, process.platform === "win32" ? "parser.exe" : "parser"),
      });
      if (!built.ok)
        throw new Error(built.diagnostics.map((d) => `${d.code}: ${d.message}`).join("\n"));
      const request = join(directory, "request.json");
      writeFileSync(request, JSON.stringify(input()));
      const expected = join(directory, "node.json");
      const node = await execFileAsync(
        process.execPath,
        ["--import", "tsx", oracle, ts7Executable(), request, expected],
        { encoding: "utf8", timeout: 45_000 },
      );
      expect(node.stdout).toBe("");
      expect(node.stderr).toBe("");
      const report = join(directory, "native.json");
      const run = await execFileAsync(built.binaryPath, [ts7Executable(), request, report], {
        encoding: "utf8",
        timeout: 45_000,
      });
      expect(run.stdout).toBe(node.stdout);
      expect(run.stderr).toBe(node.stderr);
      const result = JSON.parse(readFileSync(report, "utf8"));
      expect(result).toEqual(JSON.parse(readFileSync(expected, "utf8")));
      expect(result.versions).toEqual(["export const before = 1;", "export const after = 2;"]);
      expect(result.closed).toBe(true);
      expect(
        result.packages.some(
          (item: { annotatedMethods: unknown }) => item.annotatedMethods !== null,
        ),
      ).toBe(true);
      expect(
        result.packages.some((item: { annotatedFields: unknown }) => item.annotatedFields !== null),
      ).toBe(true);
      expect(result.packages.some((item: { nullable: unknown }) => item.nullable !== null)).toBe(
        true,
      );
      expect(result.packages.some((item: { find: unknown }) => item.find !== null)).toBe(true);
      for (const item of result.packages) {
        expect([item.methodAgain, item.fieldAgain, item.nullableAgain, item.findAgain]).toEqual([
          null,
          null,
          null,
          null,
        ]);
      }
      expect(
        result.files.at(-1).imports.uses.map((use: { specifier: string }) => use.specifier),
      ).toEqual(["deep"]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
}
