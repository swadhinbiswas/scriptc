import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { compile } from "@scriptc/compiler";

describe.skipIf(process.platform !== "darwin").each(["llvm"] as const)(
  "FFI framework links, %s",
  (backend) => {
    test("links a framework symbol without an extra object or library input", async () => {
      const outDir = mkdtempSync(join(tmpdir(), "scriptc-ffi-framework-"));
      const entry = join(outDir, "app.ts");
      const profile = join(outDir, "ffi.json");
      writeFileSync(
        entry,
        "declare function nativeTime(): number; console.log(nativeTime() > 0);\n",
      );
      writeFileSync(
        profile,
        JSON.stringify({
          ffi_format: 7,
          frameworks: ["CoreFoundation"],
          functions: [
            { name: "nativeTime", symbol: "CFAbsoluteTimeGetCurrent", params: [], returns: "f64" },
          ],
        }),
      );
      const result = await compile(entry, {
        backend,
        sanitize: process.env["SCRIPTC_SAN"] === "1",
        outDir,
        outPath: join(outDir, "program"),
        ffiProfilePath: profile,
      });
      if (!result.ok)
        throw new Error(result.diagnostics.map((d) => `${d.code}: ${d.message}`).join("\n"));
      const native = spawnSync(result.binaryPath, [], { encoding: "utf8", timeout: 10_000 });
      expect(native.error).toBeUndefined();
      expect(native.stderr).toBe("");
      expect(native.status).toBe(0);
      expect(native.stdout).toBe("true\n");
    });
  },
);
