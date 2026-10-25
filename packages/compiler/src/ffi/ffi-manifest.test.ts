import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { loadFfiProfile } from "./ffi-manifest.js";

test("format 7 catalogs normalize Node bool and allocate distinct static callback slots", () => {
  const dir = mkdtempSync(join(tmpdir(), "scriptc-ffi-catalog-"));
  const file = join(dir, "ffi.json");
  try {
    const profile = {
      ffi_format: 7,
      frameworks: ["Foundation"],
      functions: [
        {
          name: "__scriptc_ffi_callback_0_0",
          symbol: "nativeBool",
          library: "native",
          params: ["bool"],
          returns: "bool",
        },
      ],
      callbacks: [{ library: "native", params: ["bool", "pointer"], returns: "bool", capacity: 2 }],
    };
    writeFileSync(file, JSON.stringify(profile));
    const result = loadFfiProfile(file);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.profile.frameworks).toEqual(["Foundation"]);
    expect(result.profile.functions[0]).toMatchObject({ params: ["u8"], returns: "u8" });
    expect(result.profile.functions).toHaveLength(5);
    expect(new Set(result.profile.functions.map((fn) => fn.name)).size).toBe(5);
    const registrations = result.profile.functions.filter(
      (fn) => fn.callbackOperation === "register",
    );
    expect(registrations).toHaveLength(2);
    expect(registrations[0]?.params).toEqual([
      {
        callback: {
          id: "callback",
          params: ["u8", "pointer"],
          returns: "u8",
          lifetime: "retained",
          invoke: "script-thread",
        },
      },
    ]);
    for (const change of [
      { ffi_format: 6 },
      { frameworks: ["-framework"] },
      { frameworks: ["A", "A"] },
      { callbacks: [{ library: "native\0", params: [], returns: "void" }] },
      ...[0, 257, 1.5].map((capacity) => ({
        callbacks: [{ library: "native", params: [], returns: "void", capacity }],
      })),
      { callbacks: [{ library: "native", params: ["cstring"], returns: "void" }] },
    ]) {
      writeFileSync(file, JSON.stringify({ ...profile, ...change }));
      expect(loadFfiProfile(file).ok).toBe(false);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test.each(["i64", "u64", "pointer"])("%s requires format 7 across calls and callbacks", (cls) => {
  const dir = mkdtempSync(join(tmpdir(), "scriptc-ffi-wide-version-"));
  const file = join(dir, "ffi.json");
  try {
    for (const placement of ["parameter", "return", "callback-parameter", "callback-return"]) {
      const callback = {
        id: "cb",
        params: [placement === "callback-parameter" ? cls : "f64"],
        returns: placement === "callback-return" ? cls : "f64",
        lifetime: "call",
      };
      const fn = {
        name: "native",
        symbol: "native",
        params: placement.startsWith("callback-")
          ? [{ callback }]
          : [placement === "parameter" ? cls : "f64"],
        returns: placement === "return" ? cls : "f64",
      };
      for (let format = placement.startsWith("callback-") ? 2 : 1; format <= 7; format++) {
        writeFileSync(file, JSON.stringify({ ffi_format: format, functions: [fn] }));
        const result = loadFfiProfile(file);
        expect(result.ok).toBe(format === 7);
        if (!result.ok)
          expect(result.diagnostics[0]?.message).toContain(`class '${cls}' requires ffi_format 7`);
      }
    }
    writeFileSync(
      file,
      JSON.stringify({
        ffi_format: 7,
        functions: [
          {
            name: "native",
            symbol: "native",
            params: [
              {
                callback: {
                  id: "cb",
                  params: [cls, { context: "cb" }],
                  returns: "void",
                  lifetime: "retained",
                  invoke: "foreign",
                },
              },
              { context: "cb" },
            ],
            returns: "void",
          },
        ],
      }),
    );
    const result = loadFfiProfile(file);
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.diagnostics[0]?.message).toContain(
        "does not support 64-bit or pointer arguments yet",
      );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test.each(["f32", "i8", "u16", "i16"])("%s requires format 6 at every ABI position", (cls) => {
  const dir = mkdtempSync(join(tmpdir(), "scriptc-ffi-version-"));
  const file = join(dir, "ffi.json");
  try {
    for (const placement of ["parameter", "return", "callback-parameter", "callback-return"]) {
      const callback = {
        id: "convert",
        params: [placement === "callback-parameter" ? cls : "f64"],
        returns: placement === "callback-return" ? cls : "f64",
        lifetime: "call",
      };
      const fn = {
        name: "native",
        symbol: "native",
        params: placement.startsWith("callback-")
          ? [{ callback }]
          : [placement === "parameter" ? cls : "f64"],
        returns: placement === "return" ? cls : "f64",
      };
      for (let format = placement.startsWith("callback-") ? 2 : 1; format <= 6; format++) {
        writeFileSync(file, JSON.stringify({ ffi_format: format, functions: [fn] }));
        const result = loadFfiProfile(file);
        if (format === 6) expect(result.ok).toBe(true);
        else {
          expect(result.ok).toBe(false);
          if (!result.ok)
            expect(result.diagnostics[0]?.message).toContain(
              `class '${cls}' requires ffi_format 6`,
            );
        }
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("mutable byte spans require format 6 and cannot be returns or callback arguments", () => {
  const dir = mkdtempSync(join(tmpdir(), "scriptc-ffi-mutable-"));
  const file = join(dir, "ffi.json");
  try {
    for (let format = 1; format <= 6; format++) {
      writeFileSync(
        file,
        JSON.stringify({
          ffi_format: format,
          functions: [{ name: "fill", symbol: "fill", params: ["mutable-bytes"], returns: "void" }],
        }),
      );
      const result = loadFfiProfile(file);
      expect(result.ok).toBe(format === 6);
      if (!result.ok) expect(result.diagnostics[0]?.message).toContain("requires ffi_format 6");
    }
    for (const fn of [
      { name: "fill", symbol: "fill", params: [], returns: "mutable-bytes" },
      {
        name: "fill",
        symbol: "fill",
        params: [
          { callback: { id: "cb", params: ["mutable-bytes"], returns: "void", lifetime: "call" } },
        ],
        returns: "void",
      },
    ]) {
      writeFileSync(file, JSON.stringify({ ffi_format: 6, functions: [fn] }));
      expect(loadFfiProfile(file).ok).toBe(false);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
