// A separate process lets the runner bound compiler hangs and crashes as well
// as program execution. It imports the current compiler source, like Vitest.
import { readFileSync, writeFileSync } from "node:fs";
import { compile } from "../../packages/compiler/src/index.js";

async function main(): Promise<void> {
  const request = JSON.parse(readFileSync(process.argv[2]!, "utf8"));
  const result = await compile(request.entry, {
    outDir: request.workDir,
    outPath: request.binary,
    sanitize: request.sanitize,
    ...(request.backend === "default" ? {} : { backend: request.backend }),
  });
  writeFileSync(request.result, JSON.stringify(result.ok
    ? { ok: true, backend: result.backend }
    : { ok: false, diagnostics: result.diagnostics }));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
