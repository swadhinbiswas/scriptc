import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

const source = fileURLToPath(new URL("../src", import.meta.url));

/** Embedded JavaScript that the compiler matches in user bundles; the
 * compiler itself never executes it. */
const embeddedHelpers = new Set(["frontend/npm-static-bundled-cjs.ts"]);

// The compiler is itself compiled by scriptc. Caches keyed by compiler
// objects belong to the object that owns their lifetime (a program's
// analysis, a lowering pass) so the compiled compiler never depends on
// which of its values can serve as weak keys.
test("compiler sources keep caches on their owners instead of weak collections", () => {
  const offenders: string[] = [];
  for (const entry of readdirSync(source, { recursive: true, encoding: "utf8" })) {
    const path = entry.replaceAll("\\", "/");
    if (!path.endsWith(".ts") || path.endsWith(".test.ts") || embeddedHelpers.has(path)) continue;
    const lines = readFileSync(join(source, entry), "utf8").split("\n");
    lines.forEach((line, index) => {
      if (/\bnew\s+(WeakMap|WeakSet|WeakRef|FinalizationRegistry)\b/.test(line))
        offenders.push(`${relative(source, join(source, entry))}:${index + 1}: ${line.trim()}`);
    });
  }
  expect(offenders).toEqual([]);
});
