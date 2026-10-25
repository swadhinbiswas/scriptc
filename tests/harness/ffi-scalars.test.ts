import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { compile } from "@scriptc/compiler";

const root = join(import.meta.dirname, "../..");
const fixture = join(root, "tests/ffi");
const sanitize = process.env["SCRIPTC_SAN"] === "1";
const scalarClasses = ["f32", "i8", "u16", "i16"] as const;

describe.each(["llvm"] as const)("native FFI scalar widths, %s", (backend) => {
  test("matches Node conversions through native calls, callbacks, and mixed register/stack arguments without an engine", async () => {
    const outDir = join(
      root,
      "node_modules/.cache/scriptc-tests/ffi-scalars",
      sanitize ? "san" : "plain",
      backend,
    );
    mkdirSync(outDir, { recursive: true });
    const object = join(outDir, "scalars.o");
    execFileSync("clang", [
      "-std=c11",
      "-O2",
      ...(sanitize ? ["-fsanitize=address"] : []),
      "-c",
      join(fixture, "scalars.native.c"),
      "-o",
      object,
    ]);
    const functions = scalarClasses.flatMap((cls) => {
      const name = cls.toUpperCase();
      return [
        { name: `native${name}`, symbol: `sf_${cls}`, params: [cls], returns: cls },
        {
          name: `callback${name}`,
          symbol: `sf_${cls}_callback`,
          params: [
            { callback: { id: "convert", params: [cls], returns: cls, lifetime: "call" } },
            cls,
          ],
          returns: "f64",
        },
      ];
    });
    const profile = join(outDir, "ffi.json");
    writeFileSync(
      profile,
      JSON.stringify({
        ffi_format: 6,
        libraries: [object],
        functions: [
          ...functions,
          {
            name: "scalarMix",
            symbol: "sf_scalar_mix",
            params: [
              "i8",
              "u16",
              "i16",
              "f32",
              "i8",
              "u16",
              "i16",
              "f32",
              "i8",
              "u16",
              "i16",
              "f32",
            ],
            returns: "f64",
          },
          {
            name: "nativeFill",
            symbol: "sf_fill",
            params: ["mutable-bytes", "u8"],
            returns: "void",
          },
          {
            name: "widthsStart",
            symbol: "sf_widths_start",
            params: [
              {
                callback: {
                  id: "widths",
                  params: ["f32", "i8", "u16", "i16", { context: "widths" }],
                  returns: "void",
                  lifetime: "retained",
                  invoke: "foreign",
                },
              },
              { context: "widths" },
            ],
            returns: "void",
          },
          {
            name: "widthsStop",
            symbol: "sf_widths_stop",
            params: [
              { callback: { release: "widthsStart:widths" } },
              { context: "widthsStart:widths" },
            ],
            returns: "void",
          },
        ],
      }),
    );
    const entry = join(fixture, "scalars.ts");
    const result = await compile(entry, {
      backend,
      sanitize,
      outDir,
      outPath: join(outDir, "program"),
      ffiProfilePath: profile,
    });
    if (!result.ok)
      throw new Error(
        result.diagnostics
          .map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`)
          .join("\n"),
      );
    const oracle = spawnSync(
      process.execPath,
      ["--import", join(fixture, "scalars.oracle.mjs"), entry],
      { encoding: "utf8" },
    );
    expect(oracle.error).toBeUndefined();
    expect(oracle.status).toBe(0);
    const native = spawnSync(result.binaryPath, [], { encoding: "utf8", timeout: 10_000 });
    expect(native.error).toBeUndefined();
    expect(native.status).toBe(oracle.status);
    expect(native.stderr).toBe(oracle.stderr);
    expect(native.stdout).toBe(oracle.stdout);
  });
});
