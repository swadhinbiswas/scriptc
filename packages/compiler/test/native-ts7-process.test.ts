import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";

const sources = join(import.meta.dirname, "../native");
const tempRoot = process.platform === "win32" ? tmpdir() : "/tmp";

test("the native server boundary owns descriptors and children across success and failure", () => {
  const dir = mkdtempSync(join(tempRoot, "scriptc-ts7-process-contracts-"));
  try {
    const windows = process.platform === "win32";
    const extension = windows ? ".exe" : "";
    const child = join(dir, "server ü & path" + extension);
    const harness = join(dir, "contracts" + extension);
    const flags = ["-std=c11", "-Wall", "-Wextra", "-Werror"];
    const target = windows ? execFileSync("clang", ["-dumpmachine"], { encoding: "utf8" }) : "";
    const unicodeFlags = /mingw|windows-gnu/.test(target) ? ["-municode"] : [];
    execFileSync("clang", [
      ...flags,
      ...unicodeFlags,
      join(sources, "ts7-process-child.test.c"),
      "-o",
      child,
    ]);
    execFileSync("clang", [
      ...flags,
      ...unicodeFlags,
      ...(process.env["SCRIPTC_SAN"] === "1" ? ["-fsanitize=address,undefined"] : []),
      join(sources, "ts7-process.test.c"),
      join(sources, "ts7-process.c"),
      "-o",
      harness,
    ]);
    for (const args of windows ? [[]] : [[], ["closed-standard"]]) {
      const run = spawnSync(harness, [child, ...args], { encoding: "utf8", timeout: 20_000 });
      expect(run.error, run.stderr).toBeUndefined();
      expect(run.signal, run.stderr).toBeNull();
      expect(run.status, run.stderr).toBe(0);
      expect(run.stdout.replace(/\r\n/g, "\n")).toBe("native process contracts passed\n");
      expect(run.stderr).toBe("");
    }
    if (!windows) {
      // A quote can occur in a POSIX executable filename; executable paths
      // are passed directly to spawn instead of constructing a shell line.
      const quoted = join(dir, 'server " quoted');
      copyFileSync(child, quoted);
      const run = spawnSync(harness, [quoted], { encoding: "utf8", timeout: 20_000 });
      expect(run.status, run.stderr).toBe(0);
      expect(run.stderr).toBe("");
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
