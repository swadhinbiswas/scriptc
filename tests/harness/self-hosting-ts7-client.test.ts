import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import { analyze, compile } from "@scriptc/compiler";
import { runClient } from "./ts7-client-harness.js";

const root = fileURLToPath(new URL("../..", import.meta.url));
const entry = join(root, "tests/fixtures/self-hosting/ts7-client.ts");
const tempRoot = process.platform === "win32" ? tmpdir() : "/tmp";

test("the production TypeScript RPC and filesystem client lowers entirely statically", () => {
  const { coverage } = analyze(entry, {});
  expect(coverage.preflightFailed).toBe(false);
  expect(coverage.stats.statementsTotal).toBeGreaterThan(200);
  expect(coverage.stats.statementsFailed, JSON.stringify(coverage.diagnostics)).toBe(0);
  expect(coverage.stats.functionsSkipped).toBe(0);
});

for (const backend of ["llvm"] as const) {
  test(`native TypeScript client talks directly to the pinned parser/checker (${backend})`, async () => {
    const dir = mkdtempSync(join(tempRoot, "scriptc-native-ts7-"));
    try {
      writeFileSync(join(dir, "disk.ts"), "export const disk = true;\n");
      // The callback must hide real content, and an empty virtual file must
      // override this invalid disk file instead of falling back to it.
      writeFileSync(join(dir, "hidden.ts"), "export const hidden = true;\n");
      writeFileSync(join(dir, "empty.ts"), "THIS IS NOT TYPESCRIPT !!!\n");
      const built = await compile(entry, {
        outDir: dir,
        outPath: join(dir, process.platform === "win32" ? "client.exe" : "client"),
        backend,
        optimization: "dev",
        sanitize: process.env["SCRIPTC_SAN"] === "1",
      });
      if (!built.ok)
        throw new Error(built.diagnostics.map((d) => `${d.code}: ${d.message}`).join("\n"));
      expect(built.backend).toBe(backend);
      const oracle = await runClient(
        process.execPath,
        ["--import", "tsx", entry],
        dir,
        join(dir, "oracle.json"),
      );
      const native = await runClient(built.binaryPath, [], dir, join(dir, "native.json"));
      const {
        surrogateBoundary: oracleSurrogates,
        semanticSurrogateBoundary: oracleSemanticSurrogates,
        ...oracleFacts
      } = JSON.parse(oracle);
      const {
        surrogateBoundary: nativeSurrogates,
        semanticSurrogateBoundary: nativeSemanticSurrogates,
        ...nativeFacts
      } = JSON.parse(native);
      // Lone surrogates in names survive the native client's AST and
      // checker round trips, as they do under Node.
      expect(oracleSurrogates).toBe("preserved");
      expect(nativeSurrogates).toBe("preserved");
      expect(oracleSemanticSurrogates).toBe("preserved");
      expect(nativeSemanticSurrogates).toBe("preserved");
      expect(nativeFacts).toEqual(oracleFacts);
      expect(nativeFacts).toEqual({
        typeText: "42",
        symbol: "answer",
        diagnostics: [2322],
        echo: true,
        binaryAst: true,
        astIdentity: true,
        astViews: true,
        checkerFacade: true,
        checkerSnapshots: true,
        semanticModel: true,
        sessionLifecycle: true,
        virtualFiles: true,
        retainedSnapshot: true,
        serverErrorRecovery: true,
        protocolFailures: true,
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}
