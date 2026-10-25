import { createHash } from "node:crypto";

/** Environment variables consumed by clang, its linker/subtools, or the
 * platform SDK selection. They are implicit command-line inputs: changing one
 * must never reuse an artifact produced under the old toolchain posture. */
const TOOLCHAIN_ENV_KEYS: readonly string[] = [
  "COMPILER_PATH",
  "GCC_EXEC_PREFIX",
  "CPATH",
  "C_INCLUDE_PATH",
  "CPLUS_INCLUDE_PATH",
  "OBJC_INCLUDE_PATH",
  "OBJCPLUS_INCLUDE_PATH",
  "LIBRARY_PATH",
  "LD_LIBRARY_PATH",
  "LD_RUN_PATH",
  "DYLD_LIBRARY_PATH",
  "DYLD_FRAMEWORK_PATH",
  "DYLD_FALLBACK_LIBRARY_PATH",
  "DYLD_FALLBACK_FRAMEWORK_PATH",
  "SDKROOT",
  "DEVELOPER_DIR",
  "MACOSX_DEPLOYMENT_TARGET",
  "IPHONEOS_DEPLOYMENT_TARGET",
  "TVOS_DEPLOYMENT_TARGET",
  "WATCHOS_DEPLOYMENT_TARGET",
  "DRIVERKIT_DEPLOYMENT_TARGET",
  "XROS_DEPLOYMENT_TARGET",
  "CCC_OVERRIDE_OPTIONS",
  "CCC_ADD_ARGS",
  "CLANG_CONFIG_FILE_SYSTEM_DIR",
  "CLANG_CONFIG_FILE_USER_DIR",
  "CC",
  "CFLAGS",
  "CPPFLAGS",
  "LDFLAGS",
  "AR",
  "RANLIB",
  "CMAKE_GENERATOR",
  "CMAKE_TOOLCHAIN_FILE",
  "ZIG_LIB_DIR",
  "ZIG_LIBC",
  "SOURCE_DATE_EPOCH",
  "ZERO_AR_DATE",
  "LANG",
  "LC_ALL",
  "LC_CTYPE",
];

/** Toolchain variables whose values name mutable files/directories consumed
 * while compiling a TU (or can inject arbitrary compiler options). Hashing the
 * value is insufficient: a header, SDK, config, compiler helper, or loaded
 * dylib can change in place while the spelling remains stable. In that posture
 * neither complete artifacts nor per-TU runtime objects are safe to reuse. */
const MUTABLE_COMPILE_ENV_KEYS: readonly string[] = [
  "COMPILER_PATH",
  "GCC_EXEC_PREFIX",
  "CPATH",
  "C_INCLUDE_PATH",
  "CPLUS_INCLUDE_PATH",
  "OBJC_INCLUDE_PATH",
  "OBJCPLUS_INCLUDE_PATH",
  "LD_LIBRARY_PATH",
  "DYLD_LIBRARY_PATH",
  "DYLD_FRAMEWORK_PATH",
  "DYLD_FALLBACK_LIBRARY_PATH",
  "DYLD_FALLBACK_FRAMEWORK_PATH",
  "SDKROOT",
  "DEVELOPER_DIR",
  "CCC_OVERRIDE_OPTIONS",
  "CCC_ADD_ARGS",
  "CLANG_CONFIG_FILE_SYSTEM_DIR",
  "CLANG_CONFIG_FILE_USER_DIR",
  // `zig cc` resolves its bundled headers/runtime through ZIG_LIB_DIR and a
  // caller-selected native libc description through ZIG_LIBC. Both values name
  // mutable compiler inputs whose contents can change behind a stable path.
  "ZIG_LIB_DIR",
  "ZIG_LIBC",
];

/** These variables only redirect link-time inputs. Runtime objects remain
 * reusable, but a complete executable could otherwise retain a library that
 * was rebuilt in place behind the same search-path spelling. */
const MUTABLE_LINK_ENV_KEYS: readonly string[] = ["LIBRARY_PATH", "LD_RUN_PATH"];

export interface ToolchainEnvironmentCachePolicy {
  completeArtifacts: boolean;
  runtimeObjects: boolean;
}

export function toolchainEnvironmentCachePolicy(
  env: NodeJS.ProcessEnv = process.env,
): ToolchainEnvironmentCachePolicy {
  const mutableCompileInput = MUTABLE_COMPILE_ENV_KEYS.some((name) => env[name] !== undefined);
  const mutableLinkInput = MUTABLE_LINK_ENV_KEYS.some((name) => env[name] !== undefined);
  return {
    completeArtifacts: !mutableCompileInput && !mutableLinkInput,
    runtimeObjects: !mutableCompileInput,
  };
}

export function toolchainEnvironmentFingerprint(env: NodeJS.ProcessEnv = process.env): string {
  const hash = createHash("sha256").update("toolchain-env-v1\0");
  for (const name of TOOLCHAIN_ENV_KEYS) {
    const value = env[name];
    const text: string = value ?? "";
    hash
      .update(name)
      .update(value === undefined ? "\0unset\0" : "\0set\0")
      .update(text)
      .update("\0");
  }
  return hash.digest("hex");
}
