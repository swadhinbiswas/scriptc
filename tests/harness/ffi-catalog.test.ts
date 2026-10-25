import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { compile } from "@scriptc/compiler";

const fixture = join(import.meta.dirname, "../ffi");
const sanitize = process.env["SCRIPTC_SAN"] === "1";
const oracle = process.env["SCRIPTC_NODE_FFI_ORACLE"];

describe.each(["llvm"] as const)("static node:ffi catalog, %s", (backend) => {
  test("binds native symbols and preserves independent library lifetimes", async () => {
    const outDir = mkdtempSync(join(tmpdir(), "scriptc-ffi-catalog-"));
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
          { name: "nativeU64", symbol: "sf_u64", library, params: ["u64"], returns: "u64" },
          {
            name: "nativePointer",
            symbol: "sf_pointer",
            library,
            params: ["pointer"],
            returns: "pointer",
          },
          { name: "nativeI64", symbol: "sf_i64", library, params: ["i64"], returns: "i64" },
          { name: "nativeByte", symbol: "sf_byte", library, params: ["bool"], returns: "bool" },
          {
            name: "firstByte",
            symbol: "sf_first_byte",
            library,
            params: ["pointer"],
            returns: "u8",
          },
        ],
      }),
    );
    const entry = join(fixture, "catalog.mjs");
    const result = await compile(entry, {
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
      "true\n9007199254740993n\ntrue\n0n 0n\n65 255\n-9223372036854775808n 18446744073709551615n\n" +
        "TypeError ERR_INVALID_ARG_VALUE\n".repeat(12) +
        "5\narity\narity\nsignature\nclosed\n42n\nsignature mismatch\nmutated signature\nmissing arguments Error SC2020\n",
    );
    // A separately linked Node library is only the oracle. scriptc links
    // the object file and must work before this dynamic library exists.
    if (oracle) {
      const shim = join(outDir, "oracle.c");
      writeFileSync(
        shim,
        "#include <stdint.h>\nuint64_t nativeU64(uint64_t v) { return v; }\nint64_t nativeI64(int64_t v) { return v; }\nuint8_t nativeByte(uint8_t v) { return v; }\nuint8_t firstByte(const uint8_t *v) { return *v; }\nvoid *nativePointer(void *v) { return v; }\n",
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
        ["--disable-warning=ExperimentalWarning", "--experimental-ffi", entry],
        { encoding: "utf8", env: { ...env, FFI_STATIC: "0" } },
      );
      expect(node.error).toBeUndefined();
      expect(node.stderr).toBe(native.stderr);
      expect(node.status).toBe(native.status);
      expect(
        node.stdout + "signature mismatch\nmutated signature\nmissing arguments Error SC2020\n",
      ).toBe(native.stdout);
    }
  });
});
