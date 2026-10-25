import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function prepareNativeCommand(directory) {
  const bin = join(directory, "bin");
  mkdirSync(bin, { recursive: true });
  // npm creates bin links before postinstall. The payload must exist in the
  // tarball, and no shebang may pin the Windows shim to an interpreter.
  // Installation replaces this placeholder with the platform executable.
  writeFileSync(
    join(bin, "scriptc.exe"),
    "echo 'scriptc: native installation is incomplete; enable install scripts and reinstall scriptc' >&2\nexit 1\n",
    { mode: 0o755 },
  );
  rmSync(join(bin, "scriptc.exe.json"), { force: true });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  prepareNativeCommand(resolve(dirname(fileURLToPath(import.meta.url)), ".."));
}
