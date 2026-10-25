import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep, win32 } from "node:path";
import { verifyLinuxAbi } from "./verify-linux-abi.mjs";

const root = realpathSync(resolve(process.argv[2] ?? "."));
const identity = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const target = identity.name.replace("@scriptc/cli-", "");
const windows = target.startsWith("win32-");
const hostPath = (value) => (windows ? value.replaceAll("\\", "/") : value);
const absolutePath = (value) => isAbsolute(value) || (windows && win32.parse(value).root !== "");
const distribution = join(root, "dist");
const binary = join(distribution, "bin", target.startsWith("win32-") ? "scriptc.exe" : "scriptc");
const toolchain = JSON.parse(readFileSync(binary + ".json", "utf8"));
if (
  toolchain.schema !== "scriptc.native-toolchain.v1" ||
  toolchain.compiler_version !== identity.version
) {
  throw new Error("native CLI manifest version does not match the package");
}
if (statSync(binary).size < 1024) throw new Error("native compiler payload is missing");
if (!target.startsWith("win32-") && !(statSync(binary).mode & 0o111))
  throw new Error("native compiler is not executable");
const within = (path) => {
  const child = relative(distribution, realpathSync(path));
  if (child === ".." || child.startsWith(".." + sep) || isAbsolute(child))
    throw new Error(`distribution references external asset: ${path}`);
};
for (const name of [
  "ts7",
  "tsc_ts",
  "llvm_package",
  "runtime_pack",
  "runtime_sources",
  "declarations",
  "comptime",
  "wasi_node_runner",
]) {
  const value = toolchain[name];
  if (typeof value !== "string" || absolutePath(value))
    throw new Error(`native toolchain needs a relative ${name}`);
  within(resolve(dirname(binary), hostPath(value)));
}
const pack = JSON.parse(
  readFileSync(
    resolve(dirname(binary), hostPath(toolchain.runtime_pack), "runtime-pack.json"),
    "utf8",
  ),
);
if (pack.version !== identity.version || pack.target.name !== toolchain.target)
  throw new Error("native compiler runtime identity mismatch");
const seen = new Set();
for (const runtime of toolchain.runtime_packs ?? []) {
  if (seen.has(runtime.target)) throw new Error(`duplicate runtime target: ${runtime.target}`);
  seen.add(runtime.target);
  if (typeof runtime.path !== "string" || absolutePath(runtime.path))
    throw new Error("native runtime pack paths must be relative");
  const directory = resolve(dirname(binary), hostPath(runtime.path));
  within(directory);
  const manifest = JSON.parse(readFileSync(join(directory, "runtime-pack.json"), "utf8"));
  const packageIdentity = JSON.parse(readFileSync(join(directory, "package.json"), "utf8"));
  if (
    manifest.schema !== "scriptc.runtime-pack.v1" ||
    manifest.target.name !== runtime.target ||
    manifest.version !== identity.version ||
    packageIdentity.version !== identity.version ||
    packageIdentity.name !== manifest.package
  )
    throw new Error(`native runtime pack identity mismatch: ${runtime.target}`);
}
for (const name of ["LICENSE", "THIRD_PARTY_NOTICES"]) {
  if (!existsSync(join(distribution, name))) throw new Error(`native compiler is missing ${name}`);
}
for (const directory of [distribution, join(distribution, "lib/runtime-sources/vendor")]) {
  if (readdirSync(directory).some((name) => ["node_modules", ".cache", "seed"].includes(name)))
    throw new Error(`development files present in ${directory}`);
}
if (process.argv.includes("--run")) {
  if (target.startsWith("linux-")) {
    for (const executable of [
      binary,
      resolve(dirname(binary), toolchain.ts7),
      resolve(dirname(binary), toolchain.comptime),
    ]) {
      verifyLinuxAbi(executable, { staticOnly: target.endsWith("-musl") });
    }
    verifyLinuxAbi(resolve(dirname(binary), toolchain.llvm_package, "bin/scriptc-llvm-codegen"), {
      staticOnly: true,
    });
  }
  const version = execFileSync(binary, ["--version"], {
    encoding: "utf8",
    env: { ...process.env, PATH: "" },
  }).trim();
  if (version !== identity.version)
    throw new Error(`native command reported ${version}, expected ${identity.version}`);
  // tsc-ts, the default checker, runs on the distribution's own platform.
  const tscTs = resolve(dirname(binary), hostPath(toolchain.tsc_ts));
  if (windows && !tscTs.endsWith("tsc-ts.exe"))
    throw new Error(`tsc_ts is not tsc-ts.exe: ${tscTs}`);
  const tscTsVersion = execFileSync(tscTs, ["--version"], {
    encoding: "utf8",
    env: { ...process.env, PATH: "" },
  }).trim();
  if (!tscTsVersion.startsWith("Version "))
    throw new Error(`the distribution's tsc-ts reported ${JSON.stringify(tscTsVersion)}`);
}
console.log(`${identity.name}@${identity.version}: native distribution verified`);
