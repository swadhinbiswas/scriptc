import { realpathSync, statSync } from "node:fs";
import { delimiter, dirname, isAbsolute, join, resolve } from "node:path";

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

/** The executable `command` names: a path, or the first match on PATH. */
function commandFile(command: string, env: NodeJS.ProcessEnv): string | null {
  if (command.includes("/")) return isFile(command) ? resolve(command) : null;
  for (const directory of (env["PATH"] ?? "/usr/bin:/bin").split(delimiter)) {
    const candidate = join(directory || ".", command);
    if (isFile(candidate)) return isAbsolute(candidate) ? candidate : resolve(candidate);
  }
  return null;
}

/**
 * Whether the compiler driver `driver` finds ld.lld for `-fuse-ld=lld`: in
 * the directory of the driver's executable (where clang looks first) or on
 * PATH. Linking still falls back to the driver's default linker when a link
 * with lld fails.
 */
export function driverFindsLld(driver: string, env: NodeJS.ProcessEnv = process.env): boolean {
  const file = commandFile(driver, env);
  if (file === null) return false;
  try {
    for (const directory of new Set([dirname(file), dirname(realpathSync(file))]))
      if (isFile(join(directory, "ld.lld"))) return true;
  } catch {
    return false;
  }
  return commandFile("ld.lld", env) !== null;
}

/** `-fuse-ld=lld` for Linux links whose driver finds ld.lld. */
export function lldLinkerArgs(
  platform: string,
  driver: string,
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  return platform === "linux" && env["SCRIPTC_LINKER"] === undefined && driverFindsLld(driver, env)
    ? ["-fuse-ld=lld"]
    : [];
}
