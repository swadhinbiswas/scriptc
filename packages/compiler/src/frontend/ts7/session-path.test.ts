import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { expect, test } from "vitest";
import { resolveFileName } from "typescript/unstable/proto";
import { Ts7Paths, ts7DocumentFile } from "./session-path.js";

const require = createRequire(import.meta.url);
const sdk = require(
  join(dirname(require.resolve("typescript/package.json")), "dist/api/path.js"),
) as {
  toPath: (file: string, cwd: string, canonical: (path: string) => string) => string;
};

test("native path identities match the pinned SDK across host platforms and virtual roots", () => {
  const roots = [
    "",
    "/",
    "/src/",
    "C:",
    "C:/",
    "C:\\src\\",
    "//server/",
    "//server/share/",
    "file:///",
    "file:///C:/",
    "file:///C%3a/",
    "file://localhost/D:/",
    "bundled:///",
    "https://server/",
    "^/untitled/ts-nul-authority/",
  ];
  const tails = [
    "",
    ".",
    "..",
    "../..",
    "file.ts",
    "file.ts/",
    "./file.ts",
    "a/../file.ts",
    "a//b/./../file.ts",
    "../../file.ts",
    "a/../../file.ts",
    "a/../..",
    "a/..",
    "a/.",
    "a//",
    "é/İ/Σ.ts",
  ];
  for (const cwd of ["/work", "C:/Work", "\\\\server\\share\\work"])
    for (const sensitive of [true, false]) {
      const native = new Ts7Paths(cwd, sensitive);
      const canonical = (s: string) => (sensitive ? s : s.toLowerCase());
      for (const root of roots)
        for (const tail of tails) {
          const file = root + tail;
          expect(native.canonical(file), JSON.stringify({ file, cwd, sensitive })).toBe(
            sdk.toPath(file, cwd, canonical),
          );
        }
    }
  for (const cwd of ["", "relative", "bundled:///"])
    expect(() => new Ts7Paths(cwd, true)).toThrow("absolute disk path");
});

test("document identifiers preserve local, UNC, bundled and virtual URI semantics", () => {
  for (const uri of [
    "file:///tmp/a%20b.ts",
    "file:///C%3A/Dir/File.ts",
    "file://localhost/C:/file.ts",
    "file://server/share/a%20b.ts",
    "bundled:///lib.esnext.d.ts",
    "untitled:Untitled-1",
    "vscode-vfs://github/org/repo/a%20b.ts",
    "scheme:/absolute",
    "file:///é.ts",
  ]) {
    expect(ts7DocumentFile({ uri }), uri).toBe(resolveFileName({ uri }));
  }
  expect(ts7DocumentFile("raw\\file.ts")).toBe("raw\\file.ts");
  for (const uri of ["missing-colon", "scheme://server", "file://[bad", "file:///bad%XX"]) {
    expect(() => ts7DocumentFile({ uri }), uri).toThrow();
    expect(() => resolveFileName({ uri }), uri).toThrow();
  }
});
