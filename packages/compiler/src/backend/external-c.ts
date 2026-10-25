/** External LLVM/C compilation for instrumented runtime development and
 * caller-supplied native sources. Production program objects use the
 * bundled LLVM helper and precompiled runtime packs. */
import { compileC } from "./native/executable.js";
import { compileLibArchive } from "./native/library.js";
import { type CcOptions, type LibArchiveOptions } from "./native/contracts.js";

export { CcCompileError, subprocessFailureDetail } from "./native/process.js";
export { compileC } from "./native/executable.js";
export { compileLibArchive } from "./native/library.js";
export {
  compilerDriverSupportsPersistentCache,
  executableNativeEnvironmentFingerprint,
} from "./native/tool-identity.js";
export {
  configuredTargetPlatform,
  isAndroidTarget,
  isIosTarget,
  isMobileTarget,
  mobileLibraryTarget,
  mobileTargetRefusal,
} from "./target-platform.js";
export { prepareBuildCacheRoot, resolveBuildCacheRoot } from "./build-cache.js";
export { resolveCc, targetPlatform, type CcDriver } from "./native/driver.js";
export { runtimeSrcDir } from "./native/runtime-inputs.js";
export {
  toolchainEnvironmentCachePolicy,
  toolchainEnvironmentFingerprint,
} from "./toolchain-environment.js";
export { type CcOptions, type LibArchiveOptions } from "./native/contracts.js";
export {
  type NativeCacheWarmProfile,
  type WarmNativeCachesOptions,
  type WarmNativeCachesResult,
  warmNativeCaches,
} from "./native/cache-warm.js";

export { ANDROID_MIN_API, IPHONEOS_MIN_VERSION } from "./target-platform.js";

/** Compile a caller-provided C or LLVM source file through an external C
 * toolchain.  Runtime development and native embedding tests also use this utility. */
export async function compileExternalC(options: CcOptions): Promise<void> {
  await compileC(options);
}

/** Build an instrumented development library through the external toolchain. */
export async function compileExternalCLibrary(options: LibArchiveOptions): Promise<void> {
  await compileLibArchive(options);
}
