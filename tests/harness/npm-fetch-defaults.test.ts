import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compile } from "@scriptc/compiler";
import { expect, test } from "vitest";

const sanitize = process.env["SCRIPTC_SAN"] === "1";
for (const backend of ["llvm"] as const) {
  test(`compiled package destructuring defaults retain global fetch (${backend})`, async () => {
    const directory = mkdtempSync(
      join(process.platform === "win32" ? tmpdir() : "/tmp", "scriptc-fetch-defaults-"),
    );
    try {
      writeFileSync(join(directory, "package.json"), '{"type":"module"}');
      const packagePath = join(directory, "node_modules/fetch-defaults");
      mkdirSync(packagePath, { recursive: true });
      writeFileSync(
        join(packagePath, "package.json"),
        JSON.stringify({
          name: "fetch-defaults",
          type: "module",
          main: "index.js",
          types: "index.d.ts",
        }),
      );
      writeFileSync(join(packagePath, "index.d.ts"), "export function run(): void;");
      // The only global fetch reads occur directly in BindingElement.initializer.
      // A whole-source name scan would also match the locally shadowed cases.
      writeFileSync(
        join(packagePath, "index.js"),
        `
const { value = fetch } = {};
const [element = fetch] = [];
/** @param {{ request?: typeof fetch | string }} options */
function defaulted(options = {}) { const { request = fetch } = options; return typeof request; }
function local(fetch) { const { request = fetch } = {}; return typeof request; }
export function run() {
  console.log(typeof value, typeof element, defaulted());
  console.log(local(7), defaulted({ request: "local" }));
  const { nested: { request = fetch } } = { nested: {} };
  console.log(typeof request);
}
`,
      );
      const entry = join(directory, "main.ts");
      writeFileSync(entry, 'import { run } from "fetch-defaults"; run();');
      const expected = spawnSync(process.execPath, [entry], { encoding: "utf8", timeout: 15_000 });
      expect(expected.error).toBeUndefined();
      expect(expected.status, expected.stderr).toBe(0);
      expect(expected.stdout).toBe("function function function\nnumber string\nfunction\n");
      expect(expected.stderr).toBe("");
      const built = await compile(entry, {
        backend,
        sanitize,
        optimization: "dev",
        outDir: directory,
        outPath: join(directory, process.platform === "win32" ? "defaults.exe" : "defaults"),
      });
      if (!built.ok)
        throw new Error(
          built.diagnostics.map((item) => `${item.code}: ${item.message}`).join("\n"),
        );
      const actual = spawnSync(built.binaryPath, [], { encoding: "utf8", timeout: 15_000 });
      expect(actual.error, actual.stderr).toBeUndefined();
      expect(actual.signal, actual.stderr).toBeNull();
      expect(actual.status, actual.stderr).toBe(expected.status);
      expect(actual.stdout).toBe(expected.stdout);
      expect(actual.stderr).toBe(expected.stderr);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
}
