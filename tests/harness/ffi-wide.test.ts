import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { compile } from "@scriptc/compiler";

const fixture = join(import.meta.dirname, "../ffi");
const sanitize = process.env["SCRIPTC_SAN"] === "1";

describe.each(["llvm"] as const)("native FFI wide integers and pointers, %s", (backend) => {
  test("preserves exact values through calls, retained callbacks, and mixed ABI arguments without an engine", async () => {
    const outDir = mkdtempSync(join(tmpdir(), "scriptc-ffi-wide-"));
    const object = join(outDir, "wide.o");
    execFileSync("clang", [
      "-std=c11",
      "-O2",
      ...(sanitize ? ["-fsanitize=address"] : []),
      "-c",
      join(fixture, "wide.native.c"),
      "-o",
      object,
    ]);
    const functions = ["u64", "i64", "pointer"].flatMap((cls) => {
      const name = cls === "pointer" ? "Pointer" : cls.toUpperCase();
      return [
        { name: `native${name}`, symbol: `sf_${cls}`, params: [cls], returns: cls },
        {
          name: `callback${name}`,
          symbol: `sf_${cls}_callback`,
          params: [{ callback: { id: "cb", params: [cls], returns: cls, lifetime: "call" } }, cls],
          returns: cls,
        },
      ];
    });
    const profile = join(outDir, "ffi.json");
    writeFileSync(
      profile,
      JSON.stringify({
        ffi_format: 7,
        libraries: [object],
        functions: [
          ...functions,
          { name: "pointerNew", symbol: "sf_pointer_new", params: [], returns: "pointer" },
          {
            name: "pointerCheck",
            symbol: "sf_pointer_check",
            params: ["pointer"],
            returns: "bool",
          },
          {
            name: "wideMix",
            symbol: "sf_wide_mix",
            params: [
              "u64",
              "f64",
              "u64",
              "f32",
              "u64",
              "f64",
              "u64",
              "f32",
              "u64",
              "f64",
              "u64",
              "f32",
              "u64",
              "f64",
            ],
            returns: "u64",
          },
          {
            name: "wideStart",
            symbol: "sf_wide_start",
            params: [
              { callback: { id: "cb", params: ["u64"], returns: "u64", lifetime: "retained" } },
            ],
            returns: "void",
          },
          { name: "wideFire", symbol: "sf_wide_fire", params: ["u64"], returns: "u64" },
          {
            name: "wideStop",
            symbol: "sf_wide_stop",
            params: [{ callback: { release: "wideStart:cb" } }],
            returns: "void",
          },
        ],
      }),
    );
    const entry = join(fixture, "wide.ts");
    const result = await compile(entry, {
      backend,
      sanitize,
      outDir,
      outPath: join(outDir, "program"),
      ffiProfilePath: profile,
    });
    if (!result.ok)
      throw new Error(result.diagnostics.map((d) => `${d.code}: ${d.message}`).join("\n"));
    const oracle = spawnSync(
      process.execPath,
      ["--import", join(fixture, "wide.oracle.mjs"), entry],
      { encoding: "utf8" },
    );
    expect(oracle.error).toBeUndefined();
    expect(oracle.status).toBe(0);
    const native = spawnSync(result.binaryPath, [], { encoding: "utf8", timeout: 10_000 });
    expect(native.error).toBeUndefined();
    expect(native.stderr).toBe(oracle.stderr);
    expect(native.status).toBe(oracle.status);
    expect(native.stdout).toBe(oracle.stdout);
  });
});
