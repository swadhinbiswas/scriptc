import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { analyze, compile } from "@scriptc/compiler";
import type { FfiProfileLoadResult } from "../../packages/compiler/src/ffi/ffi-manifest.js";

const root = join(import.meta.dirname, "../..");
const entry = join(root, "tests/fixtures/self-hosting/ffi-profile.ts");
const nativeProfile = join(root, "packages/compiler/native/ts7-process.ffi.json");
const fn = (name: string, params: unknown[], returns = "void") => ({
  name,
  symbol: name,
  params,
  returns,
});
const callback = (
  lifetime: string,
  params: unknown[],
  invoke = "script-thread",
  returns = "void",
) => ({
  callback: { id: "visit", params, returns, lifetime, invoke },
});
const context = { context: "visit" };
const release = { callback: { release: "register:visit" } };
const releaseContext = { context: "register:visit" };
const profile = (format: number, functions: unknown[]) => ({ ffi_format: format, functions });

test("the production FFI profile parser lowers entirely statically", () => {
  const { coverage } = analyze(entry, {});
  expect(coverage.preflightFailed, JSON.stringify(coverage.diagnostics)).toBe(false);
  expect(coverage.stats.statementsFailed, JSON.stringify(coverage.diagnostics)).toBe(0);
  expect(coverage.stats.functionsSkipped).toBe(0);
});

for (const backend of ["llvm"] as const) {
  test(`native FFI profile validation and release resolution (${backend})`, async () => {
    const dir = mkdtempSync(
      join(process.platform === "win32" ? tmpdir() : "/tmp", "scriptc-native-ffi-profile-"),
    );
    try {
      const built = await compile(entry, {
        outDir: dir,
        outPath: join(dir, process.platform === "win32" ? "profile.exe" : "profile"),
        backend,
        optimization: "dev",
        sanitize: process.env["SCRIPTC_SAN"] === "1",
      });
      if (!built.ok)
        throw new Error(built.diagnostics.map((d) => `${d.code}: ${d.message}`).join("\n"));
      expect(built.backend).toBe(backend);
      const file = join(dir, "input.json");
      const check = (
        name: string,
        input: string | undefined,
        error?: string,
      ): FfiProfileLoadResult => {
        if (input !== undefined) writeFileSync(file, input);
        const inputPath = input === undefined ? join(dir, "missing.json") : file;
        const options = {
          cwd: root,
          encoding: "utf8" as const,
          timeout: 15_000,
          maxBuffer: 1024 * 1024,
        };
        const node = spawnSync(process.execPath, ["--import", "tsx", entry, inputPath], options);
        const native = spawnSync(built.binaryPath, [inputPath], {
          ...options,
          env: { ...process.env, PATH: "" },
        });
        for (const result of [node, native]) {
          expect(result.error, name).toBeUndefined();
          expect(result.signal, name + "\n" + result.stderr).toBeNull();
          expect(result.status, name + "\n" + result.stderr).toBe(0);
          expect(result.stderr, name).toBe("");
        }
        const result = JSON.parse(native.stdout) as FfiProfileLoadResult;
        expect(result, name).toEqual(JSON.parse(node.stdout));
        expect(result.ok, name).toBe(error === undefined);
        if (!result.ok) {
          expect(result.diagnostics).toHaveLength(1);
          expect(result.diagnostics[0]!.code).toBe("SC5001");
          expect(result.diagnostics[0]!.message, name).toContain(error);
        }
        return result;
      };
      check("native TypeScript transport", readFileSync(nativeProfile, "utf8"));
      for (const format of [1, 2, 3, 4, 5, 6, 7]) {
        check(`empty format ${format}`, JSON.stringify(profile(format, [])));
        check(
          `scalar format ${format}`,
          JSON.stringify(
            profile(format, [
              fn("scalar", ["f64", "bool", "u8", "u32", "i32", "string", "bytes"], "i32"),
            ]),
          ),
        );
      }
      check(
        "call callback",
        JSON.stringify(profile(2, [fn("call", [callback("call", ["f64", context]), context])])),
      );
      check(
        "copied callback inputs",
        JSON.stringify(
          profile(3, [fn("call", [callback("call", ["cstring", "string", "bytes"])])]),
        ),
      );
      check(
        "foreign retained callback",
        JSON.stringify(
          profile(5, [
            fn("register", [callback("retained", ["bytes", context], "foreign"), context]),
          ]),
        ),
      );
      check(
        "extended scalar classes",
        JSON.stringify(
          profile(6, [
            fn("scalars", ["f32", "i8", "u16", "i16", "mutable-bytes"], "f32"),
            fn("call", [callback("call", ["f32", "i8", "u16", "i16"], "script-thread", "i16")]),
          ]),
        ),
      );
      check(
        "wide scalar classes",
        JSON.stringify(profile(7, [fn("wide", ["i64", "u64", "pointer"], "u64")])),
      );
      const catalog = check(
        "static catalog and callback pool",
        JSON.stringify({
          ...profile(7, [{ ...fn("native", ["bool", "pointer"], "bool"), library: "native" }]),
          frameworks: ["Foundation"],
          callbacks: [
            { library: "native", params: ["u64", "pointer"], returns: "void", capacity: 2 },
          ],
        }),
      );
      if (!catalog.ok) throw new Error("expected catalog");
      expect(catalog.profile.functions[0]).toMatchObject({
        library: "native",
        params: ["u8", "pointer"],
        returns: "u8",
      });
      expect(catalog.profile.functions).toHaveLength(5);

      for (const withContext of [false, true]) {
        const params = withContext ? ["f64", context, "bytes"] : ["f64", "bytes"];
        const register = fn(
          "register",
          withContext ? [callback("retained", params), context] : [callback("retained", params)],
        );
        const unregister = fn("unregister", withContext ? [release, releaseContext] : [release]);
        for (const functions of [
          [register, unregister],
          [unregister, register],
        ]) {
          const result = check("release resolution", JSON.stringify(profile(4, functions)));
          if (!result.ok) throw new Error("expected resolved release");
          expect(
            result.profile.functions.find((item) => item.name === "unregister")!.params[0],
          ).toEqual({
            callback: { release: "register:visit", params, returns: "void" },
          });
        }
      }

      const rejects: [string, unknown, string][] = [
        ["root array", [], "must be a JSON object"],
        ["root null", null, "must be a JSON object"],
        ["unknown format", profile(8, []), "unsupported ffi_format"],
        ["unknown key", { ...profile(1, []), typo: true }, "unknown field 'typo'"],
        ["invalid binding", profile(1, [fn("bad-name", [])]), "not a plain TypeScript identifier"],
        ["duplicate binding", profile(1, [fn("same", []), fn("same", [])]), "declared twice"],
        ["versioned scalar", profile(5, [fn("scalar", ["i8"])]), "requires ffi_format 6"],
        [
          "versioned callback",
          profile(2, [fn("call", [callback("call", ["bytes"])])]),
          "requires ffi_format 3",
        ],
        [
          "invalid callback class",
          profile(2, [fn("call", [callback("call", ["bad"])])]),
          "must be one of",
        ],
        [
          "versioned retained callback",
          profile(3, [fn("register", [callback("retained", [])])]),
          "requires ffi_format 4",
        ],
        ["versioned release", profile(3, [fn("unregister", [release])]), "requires ffi_format 4"],
        ["orphaned context", profile(2, [fn("call", [context])]), "has no matching callback"],
        [
          "missing outer context",
          profile(2, [fn("call", [callback("call", [context])])]),
          "exactly once in both",
        ],
        [
          "duplicate context",
          profile(2, [fn("call", [callback("call", [context]), context, context])]),
          "appears 2 times",
        ],
        [
          "missing release target",
          profile(4, [fn("unregister", [release])]),
          "no matching retained callback",
        ],
        [
          "non-retained target",
          profile(4, [fn("unregister", [release]), fn("register", [callback("call", [])])]),
          "targets a non-retained callback",
        ],
        [
          "same call releases registration",
          profile(4, [fn("register", [callback("retained", []), release])]),
          "registered by the same call",
        ],
        [
          "release missing context",
          profile(4, [
            fn("register", [callback("retained", [context]), context]),
            fn("unregister", [release]),
          ]),
          "must declare its context",
        ],
        [
          "release extra context",
          profile(4, [
            fn("register", [callback("retained", [])]),
            fn("unregister", [release, releaseContext]),
          ]),
          "must not declare a context",
        ],
        [
          "foreign callback missing context",
          profile(5, [fn("register", [callback("retained", [], "foreign")])]),
          "requires a context entry",
        ],
        [
          "foreign callback returns value",
          profile(5, [
            fn("register", [callback("retained", [context], "foreign", "f64"), context]),
          ]),
          "requires returns 'void'",
        ],
        [
          "duplicate libraries",
          { ...profile(1, []), libraries: ["input.json", "input.json"] },
          "duplicate path",
        ],
        ["directory link input", { ...profile(1, []), libraries: ["."] }, "does not name a file"],
        ["missing link input", { ...profile(1, []), libraries: ["missing.a"] }, "cannot be read"],
        [
          "library flag injection",
          { ...profile(1, []), system_libraries: ["-lwrong"] },
          "not a library name",
        ],
      ];
      for (const [name, input, error] of rejects) check(name, JSON.stringify(input), error);
      check("missing profile", undefined, "cannot read manifest");
      check(
        "relative library paths",
        JSON.stringify({ ...profile(1, []), libraries: ["input.json"], system_libraries: ["m"] }),
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}
