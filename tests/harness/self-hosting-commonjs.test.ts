import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { analyze, compile } from "@scriptc/compiler";
import { expect, test } from "vitest";
import { ts7Executable } from "../../packages/compiler/src/frontend/ts7/rpc-api.js";

import { cjsLexerCases } from "../../packages/compiler/test/cjs-lexer-cases.js";

const root = join(import.meta.dirname, "../..");
const entry = join(root, "tests/fixtures/self-hosting/cjs-client.ts");
const oracle = join(root, "tests/fixtures/self-hosting/cjs-client-node.ts");
const nativeSources = join(root, "packages/compiler/native");
const tempRoot = process.platform === "win32" ? tmpdir() : "/tmp";
const sanitize = process.env["SCRIPTC_SAN"] === "1";

function input() {
  const fixture = readFileSync(
    join(root, "tests/fixtures/npm-static/node_modules/bundled-function/index.js"),
    "utf8",
  );
  const rewrite = [
    { name: "bundled function", source: fixture },
    { name: "quoted helper", source: fixture.replaceAll('"default"', "'de\\u0066ault'") },
    {
      name: "helper drift",
      source: fixture.replace("return to;", 'console.log("effect"); return to;'),
    },
    { name: "return newline", source: fixture.replace("return to;", "return\nto;") },
    { name: "namespace escape", source: fixture + "\nconsole.log(first === second);" },
    { name: "factory capture", source: fixture.replace("() => /a+/g", "() => module.exports") },
    { name: "plain", source: "exports.value = 1;" },
    { name: "deep", source: fixture + "\nconst deep = " + "value + ".repeat(1800) + "value;" },
  ].map((item) => ({
    ...item,
    stamped: [] as string[],
    stars: [] as { specifier: string; names: string[] }[],
  }));
  for (const name of ["gtable", "gtstar", "gtbarrel", "gtdefine", "gtwrap"]) {
    const source = readFileSync(
      join(root, "tests/fixtures/npm/node_modules", name, "dist/index.js"),
      "utf8",
    );
    rewrite.push({
      name,
      source,
      stamped: ["gtable"],
      stars: [
        { specifier: "./leaf.js", names: ["leaf", "default", "__esModule"] },
        { specifier: "./extra.js", names: ["extra", "default", "__esModule"] },
        { specifier: "./a.js", names: ["a", "shared", "default", "__esModule"] },
        { specifier: "./b.js", names: ["b", "shared", "default", "__esModule"] },
      ],
    });
  }
  return {
    lex: cjsLexerCases,
    rewrite,
    tokens: [
      "return to;",
      "return\nto;",
      "return/*\n*/to;",
      '"default"',
      "'de\\u0066ault'",
      "/*",
      "`template`",
      "a ??= b",
      "a ||= b",
    ],
  };
}

for (const backend of ["llvm"] as const) {
  test(`CommonJS detection and package rewrites run without Node (${backend})`, async () => {
    const directory = mkdtempSync(join(tempRoot, "scriptc-commonjs-native-"));
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
      const { coverage } = analyze(entry, { ffiProfilePath: profile });
      expect(coverage.preflightFailed, JSON.stringify(coverage.diagnostics)).toBe(false);
      expect(coverage.diagnostics).toEqual([]);
      expect(coverage.stats.statementsFailed).toBe(0);
      expect(coverage.stats.functionsSkipped).toBe(0);
      const built = await compile(entry, {
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
      const node = spawnSync(
        process.execPath,
        ["--import", "tsx", oracle, ts7Executable(), request, expected],
        { encoding: "utf8", timeout: 45_000 },
      );
      expect(node.error, node.stderr).toBeUndefined();
      expect(node.status, node.stderr).toBe(0);
      expect(node.stdout).toBe("");
      expect(node.stderr).toBe("");
      const report = join(directory, "native.json");
      const run = spawnSync(built.binaryPath, [ts7Executable(), request, report], {
        encoding: "utf8",
        timeout: 45_000,
      });
      expect(run.error, run.stderr).toBeUndefined();
      expect(run.signal, run.stderr).toBeNull();
      expect(run.status, run.stderr).toBe(0);
      expect(run.stdout).toBe(node.stdout);
      expect(run.stderr).toBe(node.stderr);
      const result = JSON.parse(readFileSync(report, "utf8"));
      expect(result).toEqual(JSON.parse(readFileSync(expected, "utf8")));
      expect(result.names).toEqual(["leaf", "middle", "own"]);
      for (let i = 0; i < cjsLexerCases.length; i++) {
        expect(result.lex[i].exports, cjsLexerCases[i]!.name).toEqual(cjsLexerCases[i]!.exports);
        expect(result.lex[i].reexports, cjsLexerCases[i]!.name).toEqual(
          cjsLexerCases[i]!.reexports ?? [],
        );
      }
      expect(typeof result.rewrite[0].result).toBe("string");
      expect(result.rewrite[0].result).not.toContain("WeakMap");
      expect(result.rewrite[2].result.degrade).toContain("__toESM");
      expect(result.rewrite[3].result.degrade).toContain("__toESM");
      expect(result.tokens[0]).not.toBe(result.tokens[1]);
      expect(result.tokens[3]).toBe(result.tokens[4]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
}
