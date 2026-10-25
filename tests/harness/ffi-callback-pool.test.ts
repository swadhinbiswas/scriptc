import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { compile } from "@scriptc/compiler";

const fixture = join(import.meta.dirname, "../ffi");
const sanitize = process.env["SCRIPTC_SAN"] === "1";
const oracle = process.env["SCRIPTC_NODE_FFI_ORACLE"];

describe.each(["llvm"] as const)("static native callback pool, %s", (backend) => {
  test.skipIf(process.platform === "win32")(
    "refuses foreign-thread invocation before touching a script closure",
    async () => {
      const outDir = mkdtempSync(join(tmpdir(), "scriptc-ffi-callback-thread-"));
      const object = join(outDir, "wide.o");
      execFileSync("clang", [
        "-std=c11",
        "-O2",
        "-c",
        join(fixture, "wide.native.c"),
        "-o",
        object,
      ]);
      const profile = join(outDir, "ffi.json");
      writeFileSync(
        profile,
        JSON.stringify({
          ffi_format: 7,
          libraries: [object],
          functions: [
            {
              name: "invoke",
              symbol: "sf_invoke_foreign",
              library: "native",
              params: ["pointer"],
              returns: "void",
            },
          ],
          callbacks: [{ library: "native", params: [], returns: "void", capacity: 1 }],
        }),
      );
      const entry = join(outDir, "foreign.mjs");
      writeFileSync(
        entry,
        'import {createRequire} from "node:module"; const ffi=createRequire(import.meta.url)("node:ffi"); const {lib,functions}=ffi.dlopen("native",{invoke:{arguments:["pointer"],return:"void"}}); const callback=lib.registerCallback({arguments:[],return:"void"},()=>console.log("unsafe")); functions.invoke(callback);',
      );
      const result = await compile(entry, {
        backend,
        sanitize,
        outDir,
        outPath: join(outDir, "program"),
        ffiProfilePath: profile,
      });
      if (!result.ok)
        throw new Error(result.diagnostics.map((d) => `${d.code}: ${d.message}`).join("\n"));
      const native = spawnSync(result.binaryPath, [], { encoding: "utf8", timeout: 10_000 });
      expect(native.error).toBeUndefined();
      expect(native.status).not.toBe(0);
      expect(native.stdout).toBe("");
      expect(native.stderr).toContain("native callback invoked outside its retained lifetime");
    },
  );
  test("keeps independent registrations and releases safely during callbacks", async () => {
    const outDir = mkdtempSync(join(tmpdir(), "scriptc-ffi-callback-pool-"));
    const object = join(outDir, "wide.o");
    execFileSync("clang", ["-std=c11", "-O2", "-c", join(fixture, "wide.native.c"), "-o", object]);
    const profile = join(outDir, "ffi.json");
    const library = join(outDir, process.platform === "darwin" ? "libwide.dylib" : "libwide.so");
    writeFileSync(
      profile,
      JSON.stringify({
        ffi_format: 7,
        libraries: [object],
        functions: [
          {
            name: "invoke",
            symbol: "sf_invoke_pointer",
            library,
            params: ["pointer", "u64"],
            returns: "u64",
          },
        ],
        callbacks: [{ library, params: ["u64"], returns: "u64", capacity: 2 }],
      }),
    );
    const result = await compile(join(fixture, "callback-pool.mjs"), {
      backend,
      sanitize,
      outDir,
      outPath: join(outDir, "program"),
      ffiProfilePath: profile,
    });
    if (!result.ok)
      throw new Error(result.diagnostics.map((d) => `${d.code}: ${d.message}`).join("\n"));
    const env = { ...process.env, FFI_LIBRARY: library, FFI_STATIC: "1" };
    const native = spawnSync(result.binaryPath, [], { encoding: "utf8", env, timeout: 10_000 });
    expect(native.error).toBeUndefined();
    expect(native.stderr).toBe("");
    expect(native.status).toBe(0);
    expect(native.stdout).toBe(
      "true 9007199254740994n 9007199254740995n\ncapacity\n45n\ncallback failed\nERR_INVALID_ARG_VALUE\n6n\n",
    );
    if (oracle) {
      const shim = join(outDir, "oracle.c");
      writeFileSync(
        shim,
        "#include <stdint.h>\nuint64_t invoke(void *fn, uint64_t value) { return ((uint64_t (*)(uint64_t))fn)(value); }\n",
      );
      execFileSync("clang", [
        process.platform === "darwin" ? "-dynamiclib" : "-shared",
        "-fPIC",
        shim,
        "-o",
        library,
      ]);
      const node = spawnSync(
        oracle,
        [
          "--disable-warning=ExperimentalWarning",
          "--experimental-ffi",
          join(fixture, "callback-pool.mjs"),
        ],
        { encoding: "utf8", env: { ...env, FFI_STATIC: "0" }, timeout: 10_000 },
      );
      expect(node.error).toBeUndefined();
      expect(node.stderr).toBe(native.stderr);
      expect(node.status).toBe(native.status);
      expect(node.stdout).toBe(
        native.stdout
          .replace("capacity\n", "")
          .replace("callback failed\n", "")
          .replace("ERR_INVALID_ARG_VALUE\n", ""),
      );
    }
  });
});
