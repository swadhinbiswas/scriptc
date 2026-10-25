import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import { compileLibrary } from "../src/index.js";

test("library data lookups do not reach dormant async methods", async () => {
  const dir = mkdtempSync("/tmp/scriptc-library-computed-");
  try {
    const entry = join(dir, "entry.mjs");
    const source = `
class Counter {
  constructor() { this.value = 7; }
  *values() { yield this.value; }
  *[Symbol.iterator]() { yield this.value; }
  async later() { return this.value; }
}
const counter = new Counter();
const reader = {
  read(object, key) { return object[key]; },
  sum(source) { let total = 0; for (const value of source) total += value; return Number(total); }
};
`;
    writeFileSync(
      entry,
      source +
        'export function result() { return Number(reader.read(counter, "value")) + reader.sum([1, 2]); }\n',
    );
    const profilePath = join(dir, "profile.json");
    writeFileSync(
      profilePath,
      JSON.stringify({
        profile_format: 1,
        name: "computed-methods",
        entry: "entry.mjs",
        emission: "llvm",
        abi: {
          prefix: "cm_",
          init_symbol: "cm_init",
          sink_register_symbol: "cm_sink",
          collect_symbol: "cm_collect",
        },
        exports: [{ export: "result", symbol: "cm_result", params: [], returns: "f64" }],
      }),
    );
    const result = await compileLibrary({ profilePath, outDir: join(dir, "out") });
    expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
    if (!result.ok) return;
    if (process.env["SCRIPTC_PORTABLE_ONLY"] !== "1") {
      const host = join(dir, "host.c"),
        binary = join(dir, "host");
      writeFileSync(
        host,
        '#include <stdio.h>\nextern void cm_init(void); extern double cm_result(void);\nint main(void) { cm_init(); printf("%.0f\\n", cm_result()); }\n',
      );
      execFileSync("clang", [host, result.archivePath, "-lm", "-o", binary]);
      const actual = execFileSync(binary, { encoding: "utf8" });
      const expected = execFileSync(
        process.execPath,
        [
          "--input-type=module",
          "-e",
          `import { result } from ${JSON.stringify(entry)}; console.log(result());`,
        ],
        { encoding: "utf8" },
      );
      expect(actual).toBe(expected);
      expect(actual).toBe("10\n");
    }
    writeFileSync(
      entry,
      source + "export function result() { return Number(counter.values().next().value); }\n",
    );
    const refused = await compileLibrary({ profilePath, outDir: join(dir, "refused") });
    expect(refused.ok).toBe(false);
    expect(refused.diagnostics.some((diagnostic) => diagnostic.code === "SC4005")).toBe(true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
