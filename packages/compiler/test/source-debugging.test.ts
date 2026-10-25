import { execFile } from "node:child_process";
import { cp, mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { expect, test } from "vitest";
import { compile } from "../src/index.js";

const exec = promisify(execFile);
const corpus = join(import.meta.dirname, "../../../tests/corpus/3066-source-debugging");
const sanitize = process.env["SCRIPTC_SAN"] === "1";

// Xcode ships this debugger. Resolve real breakpoints after temporary native
// objects have been deleted, including after the executable cache restores.
test.runIf(process.platform === "darwin").each(["llvm"] as const)(
  "dev %s builds preserve source breakpoints across cache hits",
  async (backend) => {
    const dir = await mkdtemp(join(tmpdir(), "scriptc-debug-"));
    try {
      const source = join(dir, 'source space é "quoted"');
      await cp(corpus, source, { recursive: true });
      const entry = join(source, "main.ts");
      const outPath = join(dir, "program");
      const options = { outDir: dir, outPath, backend, optimization: "dev" as const, sanitize };
      const oracle = await exec(process.execPath, [entry]);
      for (let build = 0; build < 2; build++) {
        const result = await compile(entry, options);
        expect(result.ok, !result.ok ? JSON.stringify(result.diagnostics) : "").toBe(true);
        if (!result.ok) return;
        expect(
          (await stat(`${outPath}.dSYM/Contents/Resources/DWARF/program`)).size,
        ).toBeGreaterThan(0);
        const native = await exec(outPath);
        expect(native.stdout).toBe(oracle.stdout);
        expect(native.stderr).toBe(oracle.stderr);
        const debug = await exec("lldb", [
          "--batch",
          outPath,
          "-o",
          "breakpoint set --file main.ts --line 4 --move-to-nearest-code false",
          "-o",
          "breakpoint set --file helper.ts --line 4 --move-to-nearest-code false",
          "-o",
          "breakpoint list",
        ]);
        expect(debug.stdout).not.toContain("pending");
        expect(debug.stdout).toContain("main.ts:4");
        expect(debug.stdout).toContain("helper.ts:4");
        await rm(outPath);
        await rm(`${outPath}.dSYM`, { recursive: true });
      }
      for (const mode of ["release", "dev", "strip"] as const) {
        const result = await compile(entry, {
          ...options,
          optimization: mode === "release" ? "release" : "dev",
          strip: mode === "strip",
        });
        expect(result.ok).toBe(true);
        if (mode === "dev") {
          expect((await stat(`${outPath}.dSYM`)).isDirectory()).toBe(true);
        } else {
          await expect(stat(`${outPath}.dSYM`)).rejects.toMatchObject({ code: "ENOENT" });
        }
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  },
);

test.runIf(process.platform === "darwin")(
  "dev LLVM object and assembly outputs carry source locations",
  async () => {
    const dir = await mkdtemp(join(tmpdir(), "scriptc-debug-object-"));
    try {
      for (const outputKind of ["obj", "asm"] as const) {
        const outPath = join(dir, `program.${outputKind}`);
        const result = await compile(join(corpus, "main.ts"), {
          outDir: dir,
          outPath,
          outputKind,
          optimization: "dev",
        });
        expect(result.ok, !result.ok ? JSON.stringify(result.diagnostics) : "").toBe(true);
        if (!result.ok) continue;
        if (outputKind === "obj") {
          const { stdout } = await exec("dwarfdump", ["--debug-line", outPath]);
          expect(stdout).toContain("main.ts");
          expect(stdout).toContain("helper.ts");
          const info = await exec("dwarfdump", ["--debug-info", outPath]);
          expect(info.stdout).toContain("DW_TAG_variable");
          expect(info.stdout).toContain("DW_TAG_formal_parameter");
        } else {
          const assembly = await readFile(outPath, "utf8");
          expect(assembly).toContain(".loc");
          expect(assembly).toContain("helper.ts");
        }
      }
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  },
);

test.each([
  "800-switch-basics.ts",
  "1021-async-ordering.ts",
  "1452-return-through-finally.ts",
  "2013-generators-sent-values.ts",
  "603-closures-rc-stress.ts",
])("dev code generation preserves control flow: %s", async (fixture) => {
  const dir = await mkdtemp(join(tmpdir(), "scriptc-debug-flow-"));
  try {
    const entry = join(corpus, "..", fixture);
    const node = await exec(process.execPath, [entry]);
    for (const backend of ["llvm"] as const) {
      const outPath = join(dir, process.platform === "win32" ? `${backend}.exe` : backend);
      const built = await compile(entry, {
        outDir: dir,
        outPath,
        backend,
        optimization: "dev",
        sanitize,
      });
      expect(built.ok, !built.ok ? JSON.stringify(built.diagnostics) : "").toBe(true);
      if (!built.ok) continue;
      const native = await exec(outPath);
      expect(native.stdout).toBe(node.stdout);
      const stderr = sanitize
        ? native.stderr.replace(
            /^==\d+==WARNING: ASan doesn't fully support makecontext\/swapcontext functions and may produce false positives in some cases!\n/gm,
            "",
          )
        : native.stderr;
      expect(stderr).toBe(node.stderr);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
