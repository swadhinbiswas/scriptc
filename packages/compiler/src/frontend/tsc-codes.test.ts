import { expect, test } from "vitest";
import { isJsSourceFileName } from "./tsc-codes.js";

test("JavaScript filename classification preserves suffix and anchor semantics", () => {
  const oracle = /\.(js|mjs|cjs|jsx)$/;
  for (const prefix of ["", "src/", "目录/😀/", "folder/".repeat(100)]) {
    for (const extension of ["js", "mjs", "cjs", "jsx", "ts", "tsx", "JS", "mjsx", "js.map"]) {
      for (const end of ["", "\n", "\r", "\r\n", "\u2028", "\u2029", "\n\n", " ", "/"]) {
        const name = `${prefix}entry.${extension}${end}`;
        expect(isJsSourceFileName(name), JSON.stringify(name)).toBe(oracle.test(name));
      }
    }
  }
  for (const name of ["", ".", "js", ".js", "a.js\nb.ts", "a.ts\nb.js"])
    expect(isJsSourceFileName(name), name).toBe(oracle.test(name));
});
