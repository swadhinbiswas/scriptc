import { basename, dirname, join, resolve } from "node:path";
import { configuredTargetPlatform as sourceTargetPlatform } from "../backend/target-platform.js";
export { wasiEnvironment, wasiPreopens } from "./wasi-paths.js";

export type CliOutputKind = "ir" | "llvm" | "asm" | "obj" | "exe";

const POSIX_SUFFIXES: Record<CliOutputKind, string> = {
  ir: ".ir.json",
  llvm: ".ll",
  asm: ".s",
  obj: ".o",
  exe: "",
};

const WINDOWS_SUFFIXES: Record<CliOutputKind, string> = {
  ...POSIX_SUFFIXES,
  asm: ".asm",
  obj: ".obj",
  exe: ".exe",
};

export function defaultOutputName(stem: string, kind: CliOutputKind, platform?: string): string {
  const selectedPlatform = platform ?? (kind === "exe" ? sourceTargetPlatform() : process.platform);
  if (kind === "exe" && selectedPlatform === "wasi") return `${stem}.wasm`;
  return `${stem}${(selectedPlatform === "win32" ? WINDOWS_SUFFIXES : POSIX_SUFFIXES)[kind]}`;
}

export interface OutputPaths {
  outDir: string;
  outPath: string;
}

/** One authority for explicit and default primary artifact paths. */
export function selectOutputPaths(
  input: string,
  kind: CliOutputKind,
  explicitOut?: string,
  platform?: string,
): OutputPaths {
  const absoluteInput = resolve(input);
  const outDir =
    explicitOut === undefined
      ? join(dirname(absoluteInput), ".scriptc")
      : dirname(resolve(explicitOut));
  const stem = basename(absoluteInput).replace(/\.(ts|mts|cts|js|mjs|cjs|c|ll)$/, "");
  return {
    outDir,
    outPath:
      explicitOut === undefined
        ? join(outDir, defaultOutputName(stem, kind, platform))
        : resolve(explicitOut),
  };
}

/** Default executable filename for the build target. Explicit --out paths
 * stay exact; only scriptc's generated default needs the Windows PE suffix. */
export function defaultExecutableName(
  stem: string,
  platform: string = sourceTargetPlatform(),
): string {
  return defaultOutputName(stem, "exe", platform);
}
