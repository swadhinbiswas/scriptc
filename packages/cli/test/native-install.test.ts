import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterEach, expect, test } from "vitest";
import { installNativeCli, nativeCliPackage } from "../scripts/install-native.mjs";
import { prepareNativeCommand } from "../scripts/prepare-native.mjs";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function fixture() {
  const root = mkdtempSync(
    join(process.platform === "win32" ? tmpdir() : "/tmp", "scriptc-install-"),
  );
  roots.push(root);
  const directory = join(root, "installation");
  const packageName = "@scriptc/cli-darwin-arm64";
  const platform = join(directory, "node_modules", packageName);
  const bin = join(platform, "dist/bin");
  mkdirSync(bin, { recursive: true });
  writeFileSync(
    join(directory, "package.json"),
    JSON.stringify({ name: "scriptc", version: "1.2.3" }),
  );
  writeFileSync(
    join(platform, "package.json"),
    JSON.stringify({ name: packageName, version: "1.2.3" }),
  );
  const binary = join(bin, process.platform === "win32" ? "scriptc.exe" : "scriptc");
  writeFileSync(binary, "native compiler payload");
  const toolchain = {
    schema: "scriptc.native-toolchain.v1",
    compiler_version: "1.2.3",
    target: "macos-arm64",
    ts7: "../lib/typescript/lib/tsc",
    llvm_package: "../lib/llvm",
    runtime_pack: "../lib/runtime",
    runtime_packs: [{ target: "macos-arm64", path: "../lib/runtime" }],
    linker: "clang",
    linker_args: [],
    dsymutil: "dsymutil",
    comptime: "../lib/comptime",
    wasi_node_runner: "../lib/wasi/cli/wasi-runner.js",
  };
  writeFileSync(binary + ".json", JSON.stringify(toolchain));
  const helpers = [
    toolchain.ts7,
    toolchain.comptime,
    join(toolchain.llvm_package, "bin/scriptc-llvm-codegen"),
  ].map((path) => resolve(bin, path));
  for (const path of helpers) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, "native helper payload", { mode: 0o644 });
  }
  return { root, directory, packageName, platform, binary, toolchain, helpers };
}

test("selects only supported native host packages, including Linux libc", () => {
  expect(nativeCliPackage("darwin", "arm64", null)).toBe("@scriptc/cli-darwin-arm64");
  expect(nativeCliPackage("win32", "x64", null)).toBe("@scriptc/cli-win32-x64-msvc");
  expect(nativeCliPackage("linux", "x64", "glibc")).toBe("@scriptc/cli-linux-x64-gnu");
  expect(nativeCliPackage("linux", "arm64", "musl")).toBe("@scriptc/cli-linux-arm64-musl");
  expect(() => nativeCliPackage("linux", "x64", null)).toThrow("identify");
  expect(() => nativeCliPackage("win32", "arm64", null)).toThrow("no native command");
});

test("installs a direct executable and relocatable references to platform assets", () => {
  const f = fixture();
  const command = installNativeCli(f.directory, f.packageName);
  expect(readFileSync(command, "utf8")).toBe("native compiler payload");
  if (process.platform !== "win32") expect(statSync(command).mode & 0o111).toBe(0o111);
  if (process.platform !== "win32") {
    for (const helper of f.helpers) expect(statSync(helper).mode & 0o111).toBe(0o111);
  }
  const moved = join(f.root, "relocated");
  renameSync(f.directory, moved);
  const installed = join(moved, "bin/scriptc.exe");
  const manifest = JSON.parse(readFileSync(installed + ".json", "utf8"));
  const platform = join(moved, "node_modules", f.packageName, "dist/lib");
  expect(resolve(dirname(installed), manifest.ts7)).toBe(join(platform, "typescript/lib/tsc"));
  expect(resolve(dirname(installed), manifest.wasi_node_runner)).toBe(
    join(platform, "wasi/cli/wasi-runner.js"),
  );
  expect(resolve(dirname(installed), manifest.runtime_packs[0].path)).toBe(
    join(platform, "runtime"),
  );
  expect(manifest.linker).toBe("clang");
  expect(JSON.stringify(manifest)).not.toContain(f.directory);
});

test("missing and mismatched packages fail without replacing an installed command", () => {
  const f = fixture();
  const command = installNativeCli(f.directory, f.packageName);
  writeFileSync(
    join(f.platform, "package.json"),
    JSON.stringify({ name: f.packageName, version: "1.2.4" }),
  );
  expect(() => installNativeCli(f.directory, f.packageName)).toThrow("found 1.2.4");
  expect(() => installNativeCli(f.directory, "@scriptc/cli-missing")).toThrow(
    "optional dependencies",
  );
  expect(readFileSync(command, "utf8")).toBe("native compiler payload");
});

test("npm links the installed native executable without an interpreter", () => {
  const f = fixture();
  // Keep the package payload small while exercising npm's native shim.
  // Production command coverage builds the real compiler in the bootstrap gate.
  const windows = process.platform === "win32";
  if (windows) copyFileSync(process.execPath, f.binary);
  else {
    const source = join(f.root, "payload.c");
    writeFileSync(
      source,
      '#include <stdio.h>\nint main(void) { puts("native compiler"); return 0; }\n',
    );
    execFileSync("clang", [source, "-o", f.binary]);
  }
  for (const helper of f.helpers) writeFileSync(helper, "#!/bin/sh\nprintf 'native helper\\n'\n");
  const packageName = "scriptc-native-install-test";
  const scripts = join(f.directory, "scripts");
  mkdirSync(scripts);
  copyFileSync(
    join(import.meta.dirname, "../scripts/install-native.mjs"),
    join(scripts, "install-native.mjs"),
  );
  writeFileSync(
    join(scripts, "fixture-install.mjs"),
    `import { installNativeCli } from './install-native.mjs'; installNativeCli(process.cwd(), ${JSON.stringify(f.packageName)});\n`,
  );
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const npmEnv = {
    ...process.env,
    NODE_PATH: "",
    npm_config_cache: join(f.root, "npm-cache"),
    npm_config_update_notifier: "false",
  };
  const pack = (directory: string): string => {
    const result = execFileSync(npm, ["pack", "--json", "--ignore-scripts"], {
      cwd: directory,
      env: npmEnv,
      encoding: "utf8",
      shell: process.platform === "win32",
    });
    return join(directory, (JSON.parse(result) as { filename: string }[])[0]!.filename);
  };
  const platformTarball = pack(f.platform);
  writeFileSync(
    join(f.directory, "package.json"),
    JSON.stringify({
      name: packageName,
      version: "1.2.3",
      type: "module",
      bin: { [packageName]: "bin/scriptc.exe" },
      files: ["bin", "scripts"],
      scripts: { postinstall: "node scripts/fixture-install.mjs" },
      optionalDependencies: { [f.packageName]: "file:" + platformTarball },
    }),
  );
  prepareNativeCommand(f.directory);
  const tarball = pack(f.directory);
  const installed = join(f.root, "npm-install");
  mkdirSync(installed);
  execFileSync(npm, ["install", "--offline", "--no-audit", "--no-fund", tarball], {
    cwd: installed,
    env: npmEnv,
    shell: process.platform === "win32",
    stdio: "pipe",
  });
  const command = join(
    installed,
    "node_modules/.bin",
    packageName + (process.platform === "win32" ? ".cmd" : ""),
  );
  const result = execFileSync(command, windows ? ["--version"] : ["native compiler"], {
    env: { ...process.env, PATH: "" },
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  expect(result.trim()).toBe(windows ? process.version : "native compiler");
  if (process.platform !== "win32") {
    const bin = join(installed, "node_modules", packageName, "bin");
    const manifest = JSON.parse(readFileSync(join(bin, "scriptc.exe.json"), "utf8"));
    for (const helper of [
      manifest.ts7,
      manifest.comptime,
      join(manifest.llvm_package, "bin/scriptc-llvm-codegen"),
    ]) {
      expect(
        execFileSync(resolve(bin, helper), [], {
          env: { ...process.env, PATH: "" },
          encoding: "utf8",
        }).trim(),
      ).toBe("native helper");
    }
  }
}, 60_000);
