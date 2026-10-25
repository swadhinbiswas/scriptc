import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { expect, test } from "vitest";
import { compile } from "../src/index.js";

const run = promisify(execFile);
const fixtures = [
  [
    "argument parsing",
    `import { parseArgs } from "node:util";
const result = parseArgs({ args: ["--name", "value"], options: { name: { type: "string" } } });
console.log(result.values.name);
`,
  ],
  // Inspection alone must not pull in styling's warning dependency.
  [
    "argument parsing with inspection",
    `import { parseArgs } from "node:util";
const result = parseArgs({ args: ["--name", "value"], options: { name: { type: "string" } } });
console.log({ name: result.values.name });
`,
  ],
  [
    "deep comparison",
    `import { isDeepStrictEqual } from "node:util";
console.log(isDeepStrictEqual({ value: [1, 2] }, { value: [1, 2] }));
console.log(isDeepStrictEqual({ value: [1, 2] }, { value: [2, 1] }));
`,
  ],
  [
    "text styling",
    `import { styleText } from "node:util";
console.log(styleText("red", "value", { validateStream: false }));
`,
  ],
] as const;

for (const optimization of ["release", "dev"] as const) {
  for (const [name, source] of fixtures) {
    test(`util runtime links independently: ${name} (${optimization})`, async () => {
      const dir = await mkdtemp(join(tmpdir(), "scriptc-util-link-"));
      try {
        const entry = join(dir, "main.mjs");
        await writeFile(entry, source);
        const built = await compile(entry, {
          outDir: dir,
          outPath: join(dir, process.platform === "win32" ? "program.exe" : "program"),
          backend: "llvm",
          optimization,
          sanitize: process.env["SCRIPTC_SAN"] === "1",
        });
        if (!built.ok)
          throw new Error(built.diagnostics.map((d) => `${d.code}: ${d.message}`).join("\n"));
        const oracle = await run(process.execPath, [entry], { encoding: "buffer" });
        const native = await run(built.binaryPath, [], { encoding: "buffer" });
        expect(native.stdout).toEqual(oracle.stdout);
        expect(native.stderr).toEqual(oracle.stderr);
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    });
  }
}
