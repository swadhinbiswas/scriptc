import { execFileSync } from "node:child_process";
import { GLIBC_RUNTIME_FLOOR } from "../packages/runtime-pack-common/scripts/glibc-toolchain.mjs";

/** Audit every executable, including process helpers, before publishing. */
export function verifyLinuxAbi(executable, { staticOnly = false } = {}) {
  const headers = execFileSync("readelf", ["--wide", "--program-headers", executable], {
    encoding: "utf8",
  });
  if (staticOnly && /\bINTERP\b/.test(headers)) {
    throw new Error(`${executable} must be a static executable`);
  }
  const versions = execFileSync("readelf", ["--wide", "--version-info", executable], {
    encoding: "utf8",
  });
  const [floorMajor, floorMinor] = GLIBC_RUNTIME_FLOOR.split(".").map(Number);
  for (const match of versions.matchAll(/\bName: (GLIBC_[\w.]+)/g)) {
    const version = /^GLIBC_(\d+)\.(\d+)(?:\.(\d+))?$/.exec(match[1]);
    if (version === null)
      throw new Error(`${executable} requires unsupported glibc ABI ${match[1]}`);
    const [, major, minor, patch] = version.map(Number);
    if (
      major > floorMajor ||
      (major === floorMajor && (minor > floorMinor || (minor === floorMinor && patch > 0)))
    ) {
      throw new Error(
        `${executable} requires ${match[0].slice(6)}; the supported baseline is glibc ${GLIBC_RUNTIME_FLOOR}`,
      );
    }
  }
}
