import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { expect, test } from "vitest";

const execFileAsync = promisify(execFile);
const platformTest = process.platform === "win32" ? test : test.skip;

platformTest("win32 timing shims link and preserve clock contracts", async () => {
  const testDir = import.meta.dirname;
  const srcDir = join(testDir, "../src");
  const buildDir = join(testDir, "build");
  const bin = join(buildDir, "test_win_time.exe");
  const configuredCompiler = process.env["SCRIPTC_CC"];
  const compiler = configuredCompiler === "zigcc" ? "zig" : (configuredCompiler ?? "clang");
  const compilerArgs = configuredCompiler === "zigcc" ? ["cc"] : [];
  await mkdir(buildDir, { recursive: true });
  await execFileAsync(compiler, [
    ...compilerArgs,
    "-std=c11",
    "-O2",
    "-Wall",
    "-Wextra",
    "-I",
    srcDir,
    "-o",
    bin,
    join(testDir, "test_win_time.c"),
    join(srcDir, "scr_win.c"),
    "-ladvapi32",
  ]);
  const { stdout, stderr } = await execFileAsync(bin);
  expect(stdout).toBe("win32 time shims ok\r\n");
  expect(stderr).toBe("");
});
