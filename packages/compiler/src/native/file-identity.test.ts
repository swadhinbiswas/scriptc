import { mkdtempSync, renameSync, rmSync, symlinkSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { nativeFileIdentity } from "./file-identity.js";

test("native tool identity invalidates same-size replacements with preserved mtime", () => {
  const root = mkdtempSync(join(tmpdir(), "scriptc-file-identity-"));
  try {
    const path = join(root, "compiler");
    writeFileSync(path, "original");
    utimesSync(path, new Date(0), new Date(0));
    const first = nativeFileIdentity(path);
    expect(nativeFileIdentity(path)).toBe(first);
    const replacement = join(root, "new");
    writeFileSync(replacement, "replaced");
    utimesSync(replacement, new Date(0), new Date(0));
    renameSync(replacement, path);
    expect(nativeFileIdentity(path)).not.toBe(first);
    expect(() => nativeFileIdentity(root)).toThrow("not a file");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test.skipIf(process.platform === "win32")(
  "native tool identity follows a retargeted symlink",
  () => {
    const root = mkdtempSync(join(tmpdir(), "scriptc-file-symlink-"));
    try {
      const current = join(root, "current");
      const first = join(root, "first");
      const second = join(root, "second");
      writeFileSync(first, "same");
      writeFileSync(second, "same");
      symlinkSync(first, current);
      const before = nativeFileIdentity(current);
      rmSync(current);
      symlinkSync(second, current);
      expect(nativeFileIdentity(current)).not.toBe(before);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  },
);
