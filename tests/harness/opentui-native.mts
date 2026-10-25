// Opt-in smoke against the actual pinned OpenTUI static archive. The ordinary
// FFI suite uses a small C oracle so the full gate needs no external download.
import { strict as assert } from "node:assert";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { compile, renderDiagnostics } from "../../packages/compiler/src/index.js";

const archive = process.argv[2];
if (!archive)
  throw new Error("usage: tsx tests/harness/opentui-native.mts /absolute/path/libopentui.a");
if (process.platform !== "darwin" && process.platform !== "linux")
  throw new Error("this probe supports macOS and Linux hosts");
const root = resolve(import.meta.dirname, "../..");
const fixtures = join(root, "tests/fixtures/opentui");
const out = join(root, "node_modules/.cache/scriptc-tests/opentui");
mkdirSync(out, { recursive: true });
const object = join(out, "adapter.o");
execFileSync("clang", ["-std=c11", "-O2", "-c", join(fixtures, "native.c"), "-o", object]);
const profile = join(out, "ffi.json");
writeFileSync(
  profile,
  JSON.stringify(
    {
      ffi_format: 6,
      libraries: [object, resolve(archive)],
      system_libraries: process.platform === "darwin" ? ["c++"] : ["stdc++", "m", "dl", "pthread"],
      functions: [
        { name: "nativeCreate", symbol: "probe_create", params: [], returns: "u32" },
        { name: "nativeDestroy", symbol: "probe_destroy", params: ["u32"], returns: "void" },
        {
          name: "nativeAppend",
          symbol: "probe_append",
          params: ["u32", "string"],
          returns: "void",
        },
        {
          name: "nativeRead",
          symbol: "probe_read",
          params: ["u32", "mutable-bytes"],
          returns: "u32",
        },
        {
          name: "nativeRender",
          symbol: "probe_render",
          params: ["string", "mutable-bytes"],
          returns: "u32",
        },
      ],
    },
    null,
    2,
  ),
);
for (const backend of ["llvm"] as const) {
  const result = await compile(join(fixtures, "native.ts"), {
    backend,
    outDir: join(out, backend),
    outPath: join(out, `opentui-${backend}`),
    ffiProfilePath: profile,
  });
  if (!result.ok) throw new Error(renderDiagnostics(result.diagnostics, result.sourceTexts));
  const child = spawnSync(result.binaryPath, [], { encoding: "utf8", timeout: 10_000 });
  assert.ifError(child.error);
  assert.equal(child.status, 0, child.stderr);
  assert.equal(child.stderr, "");
  assert.equal(child.stdout, "Hello, scriptc! café 🎉\n0 0 0\nHello, static OpenTUI!\n");
  console.log(`${backend}: OpenTUI text buffer and renderer passed without a JS engine`);
}
